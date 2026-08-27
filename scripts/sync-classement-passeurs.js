// Synchronise le classement des passeurs d'une division (foot-direct.com,
// ex: "Classement Passeur Ligue 3") vers la table stats_officielles
// (colonne passes_decisives), pour les joueurs FootLight de cette
// division/saison. Complète sync-flashscore-officielles.js (même table,
// autre source) : L'Équipe ne fournit pas du tout le passeur d'un but
// (vérifié via diagnostic-lequipe-specifics.js), donc aucun moyen de
// déduire les passes décisives des scores de match comme pour buts
// encaissés/points — un classement dédié est la seule source disponible.
//
// Sécurité : DRY_RUN=true par défaut. Il faut positionner explicitement
// DRY_RUN=false pour écrire.
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';

const targetUrl = process.env.TARGET_URL;
const division = process.env.DIVISION || 'Ligue 3';
const saison = process.env.SAISON;
const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!targetUrl) { console.error('TARGET_URL manquant.'); process.exit(1); }
if (!saison) { console.error('SAISON manquant (ex: 2026-2027).'); process.exit(1); }
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);

const supabase = createClient(supabaseUrl, supabaseKey);

function normaliser(str) {
  return (str || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}
// Même convention que lib-sync-lequipe-match-stats.js (abregeAttendu) :
// "Prénom Nom" -> "p. nom", pour matcher le format du classement
// ("Z. Bagbema").
function abregeAttendu(prenom, nom) {
  if (!prenom || !nom) return null;
  return normaliser(`${prenom[0]}. ${nom}`);
}

// ---- 1. Page classement des passeurs ----
const res = await fetch(targetUrl, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language': 'fr-FR,fr;q=0.9',
  },
});
if (!res.ok) { console.error(`Échec chargement : statut ${res.status}`); process.exit(1); }
const html = await res.text();
const $ = cheerio.load(html);

const $table = $('table').first();
if (!$table.length) {
  // Cas normal en début de saison (constaté sur National 1, 27/08/2026) :
  // foot-direct.com affiche "Aucune stat disponible" tant qu'aucune passe
  // décisive n'a encore été enregistrée pour la division — ce n'est pas une
  // erreur de scraping (statut HTTP 200, page valide), donc on sort proprement
  // plutôt que de faire échouer le job (repris par diagnostic-foot-direct-
  // national1-passeurs.js).
  if (/aucune stat disponible/i.test($('body').text())) {
    console.log('Aucune statistique disponible sur la page pour le moment (championnat probablement en tout début de saison) — rien à faire.');
    process.exit(0);
  }
  console.error('Aucune table trouvée sur la page.');
  process.exit(1);
}

const passeurs = [];
$table.find('tr').each((i, tr) => {
  const cells = $(tr).find('td').map((k, td) => $(td).text().trim()).get();
  if (cells.length < 3) return; // ligne d'en-tête ou incomplète
  // Colonnes attendues : [rang, "P. Nom" (éventuellement suivi d'un poste
  // en majuscules type "ATT"/"MIL"/"DEF"/"DG"), PD, PD/M, PD/90m.]
  const nomBrut = cells[1];
  const pd = parseInt(cells[2], 10);
  if (!nomBrut || Number.isNaN(pd)) return;
  const nomSansPoste = nomBrut.replace(/\s+(GB|DEF|DG|DD|MIL|ATT)$/i, '').trim();
  passeurs.push({ nomAbrege: normaliser(nomSansPoste), pd });
});
console.log(`${passeurs.length} ligne(s) de passeur(s) extraite(s) de la page.\n`);

// ---- 2. Joueurs FootLight de la division/saison ----
const { data: joueurs, error: jErr } = await supabase.from('joueurs').select('id, prenom, nom, club').eq('niveau', division).eq('saison', saison);
if (jErr) { console.error('Erreur lecture joueurs :', jErr.message); process.exit(1); }
console.log(`${joueurs?.length || 0} joueur(s) FootLight en ${division} (${saison}).\n`);

// ---- 3. Rapprochement par nom abrégé ----
let totalMaj = 0, totalAmbigus = 0;
for (const p of passeurs) {
  const correspondances = (joueurs || []).filter((j) => abregeAttendu(j.prenom, j.nom) === p.nomAbrege);
  if (!correspondances.length) continue; // pas un joueur FootLight, ignoré silencieusement
  if (correspondances.length > 1) {
    console.log(`"${p.nomAbrege}" : ${correspondances.length} joueurs FootLight partagent cet abrégé, ambigu, ignoré.`);
    totalAmbigus++;
    continue;
  }
  const joueur = correspondances[0];
  console.log(`${joueur.prenom} ${joueur.nom} (${joueur.club}) : ${p.pd} passe(s) décisive(s)`);
  totalMaj++;

  if (!dryRun) {
    const { error: upErr } = await supabase.from('stats_officielles').upsert({
      joueur_id: joueur.id,
      saison,
      source: 'footdirect',
      passes_decisives: p.pd,
      lien_source: targetUrl,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'joueur_id,saison,source' });
    if (upErr) console.log(`  Erreur écriture : ${upErr.message}`);
  }
}

console.log(`\nRésumé : ${totalMaj} mise(s) à jour ${dryRun ? 'proposée(s)' : 'effectuée(s)'}, ${totalAmbigus} ambiguïté(s) ignorée(s).`);
if (dryRun) console.log('DRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
