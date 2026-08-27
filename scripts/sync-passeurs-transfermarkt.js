// Synchronise le classement des passeurs (assists) depuis transfermarkt.fr
// vers la table stats_officielles (colonne passes_decisives), en
// complément de sync-classement-passeurs.js (foot-direct.com). Confirmé
// par l'utilisateur : transfermarkt.fr expose bien un classement des
// passeurs dédié, sous
// https://www.transfermarkt.fr/{slug}/assistliste/wettbewerb/{code}/saison_id/{annee}
//
// transfermarkt.fr nécessite un navigateur headless (fetch() direct renvoie
// une page vide) — voir decouverte-effectif-transfermarkt.js.
//
// Repli constaté en tout début de saison pour National 1/2 (peu ou pas de
// passes décisives encore enregistrées) : la page retombe sur un tableau
// différent, plus court (en-têtes "Club"/"Valeur marchande" au lieu de
// "Nat."/"Âge" + colonnes matchs/passes) — détecté et skip propre plutôt
// qu'une erreur, même principe que "Aucune stat disponible" côté
// foot-direct.com (sync-classement-passeurs.js).
//
// Sécurité : DRY_RUN=true par défaut.
import { chromium } from 'playwright';
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

const browser = await chromium.launch();
const page = await browser.newPage({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  locale: 'fr-FR',
});
await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 60000 });
console.log(`Page : "${await page.title()}"`);

const entetes = await page.evaluate(() => {
  const table = document.querySelector('table.items');
  return table ? [...table.querySelectorAll('thead th')].map((th) => th.textContent.trim()) : null;
});

if (!entetes || entetes.includes('Valeur marchande')) {
  console.log('Tableau de repli détecté ("Valeur marchande" au lieu des stats réelles) — pas de passes décisives disponibles pour cette compétition pour le moment. Rien à faire.');
  await browser.close();
  process.exit(0);
}

const passeurs = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('table.items > tbody > tr')];
  return rows.map((row) => {
    const nomEl = row.querySelector('td.hauptlink a, a.spielprofil_tooltip');
    const nom = nomEl ? nomEl.textContent.trim() : null;
    const cellulesZentriert = [...row.querySelectorAll('td.zentriert')].map((td) => td.textContent.trim());
    // Les deux dernières colonnes "zentriert" numériques sont Matchs puis
    // Passes décisives (confirmé par decouverte-assistliste-transfermarkt.js
    // sur Ligue 3 : Kamil Bensoula rang 2, "3" matchs, "2" passes,
    // cohérent avec foot-direct.com).
    const nums = cellulesZentriert.filter((c) => /^\d+$/.test(c));
    const pd = nums.length ? parseInt(nums[nums.length - 1], 10) : null;
    return { nom, pd };
  }).filter((p) => p.nom && p.pd != null);
});
console.log(`${passeurs.length} passeur(s) extrait(s) de la page.\n`);

const { data: joueurs, error: jErr } = await supabase.from('joueurs').select('id, prenom, nom, club').eq('niveau', division).eq('saison', saison);
if (jErr) { console.error('Erreur lecture joueurs :', jErr.message); await browser.close(); process.exit(1); }
console.log(`${joueurs?.length || 0} joueur(s) FootLight en ${division} (${saison}).\n`);

let totalMaj = 0, totalAmbigus = 0;
for (const p of passeurs) {
  const nomCible = normaliser(p.nom);
  const correspondances = (joueurs || []).filter((j) => normaliser(`${j.prenom} ${j.nom}`) === nomCible);
  if (!correspondances.length) continue; // pas un joueur FootLight, ignoré silencieusement
  if (correspondances.length > 1) {
    console.log(`"${p.nom}" : ${correspondances.length} joueurs FootLight partagent ce nom, ambigu, ignoré.`);
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
      source: 'transfermarkt',
      passes_decisives: p.pd,
      lien_source: targetUrl,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'joueur_id,saison,source' });
    if (upErr) console.log(`  Erreur écriture : ${upErr.message}`);
  }
}

console.log(`\nRésumé : ${totalMaj} mise(s) à jour ${dryRun ? 'proposée(s)' : 'effectuée(s)'}, ${totalAmbigus} ambiguïté(s) ignorée(s).`);
if (dryRun) console.log('DRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');

await browser.close();
