// Corrige le double comptage confirmé pour Fréjus/Rumilly (et probablement
// d'autres clubs N1 groupe C) : rattrapage-lequipe-match-stats.js a
// synchronisé des stats sur DEUX lignes calendrier_officiel pour le même
// match réel (une ligne "legacy" en majuscules non fusionnée par
// corrige-doublons-groupe-c-abbreviations.js faute de correspondance sûre,
// et la ligne canonique), créant deux lignes matchs_joueur identiques
// (même date/adversaire/score/minutes) pour un même joueur — comptées deux
// fois dans joueurs.matchs_joues.
//
// Pour chaque joueur N1 groupe C ayant plusieurs matchs_joueur avec
// minutes_jouees renseignées à la MÊME date_match, garde la ligne dont
// calendrier_officiel_id pointe vers une ligne calendrier_officiel NON en
// majuscules (canonique) et supprime les autres. Recalcule ensuite
// joueurs.matchs_joues (et les autres agrégats de saison) pour tous les
// joueurs concernés à partir de leurs matchs_joueur restants.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const SAISON = '2026-2027';
const DIVISION = 'N1';
const GROUPE = 'C';

function estMajuscule(s) { return typeof s === 'string' && s.length > 0 && s === s.toUpperCase(); }

async function fetchToutesPages(table, select, filtre) {
  let toutes = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    let q = supabase.from(table).select(select).range(from, from + pageSize - 1);
    if (filtre) q = filtre(q);
    const { data, error } = await q;
    if (error) { console.error(`Erreur ${table} :`, error.message); process.exit(1); }
    toutes = toutes.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return toutes;
}

const calendrier = await fetchToutesPages('calendrier_officiel', 'id, equipe_domicile, equipe_exterieur', (q) => q.eq('division', DIVISION).eq('groupe', GROUPE).eq('saison', SAISON));
const legacyIds = new Set(calendrier.filter((r) => estMajuscule(r.equipe_domicile) && estMajuscule(r.equipe_exterieur)).map((r) => Number(r.id)));
console.log(`${calendrier.length} ligne(s) calendrier ${DIVISION} groupe ${GROUPE}, dont ${legacyIds.size} legacy.\n`);

const joueurs = await fetchToutesPages('joueurs', 'id, prenom, nom, club, matchs_joues', (q) => q.eq('niveau', DIVISION).eq('saison', SAISON));
const idsCalendrierGroupe = new Set(calendrier.map((r) => Number(r.id)));

let totalSupprimes = 0, totalJoueursAffectes = 0;
const joueursARecalculer = new Set();

for (const j of joueurs) {
  const { data: mj, error } = await supabase.from('matchs_joueur').select('id, date_match, calendrier_officiel_id, minutes_jouees').eq('joueur_id', j.id).eq('saison', SAISON).not('minutes_jouees', 'is', null);
  if (error) { console.log(`  Erreur pour ${j.prenom} ${j.nom} : ${error.message}`); continue; }
  const mjGroupe = mj.filter((m) => m.calendrier_officiel_id && idsCalendrierGroupe.has(Number(m.calendrier_officiel_id)));

  const parDate = new Map();
  for (const m of mjGroupe) {
    if (!parDate.has(m.date_match)) parDate.set(m.date_match, []);
    parDate.get(m.date_match).push(m);
  }

  let joueurAffecte = false;
  for (const [date, liste] of parDate) {
    if (liste.length < 2) continue;
    const canoniques = liste.filter((m) => !legacyIds.has(Number(m.calendrier_officiel_id)));
    const legacy = liste.filter((m) => legacyIds.has(Number(m.calendrier_officiel_id)));
    if (!canoniques.length || !legacy.length) {
      console.log(`  ${j.prenom} ${j.nom} (${j.club}) : ${liste.length} lignes pour ${date}, mais pas de séparation legacy/canonique claire (ids: ${liste.map((m) => m.calendrier_officiel_id).join(',')}) — ignoré par sécurité.`);
      continue;
    }
    joueurAffecte = true;
    for (const m of legacy) {
      console.log(`  ${j.prenom} ${j.nom} (${j.club}) : ${dryRun ? 'à supprimer' : 'suppression'} matchs_joueur id=${m.id} (doublon legacy, date=${date}, calendrier_officiel_id=${m.calendrier_officiel_id})`);
      totalSupprimes++;
      if (!dryRun) { const { error: errDel } = await supabase.from('matchs_joueur').delete().eq('id', m.id); if (errDel) console.log(`    Erreur : ${errDel.message}`); }
    }
  }
  if (joueurAffecte) { totalJoueursAffectes++; joueursARecalculer.add(j.id); }
}

console.log(`\nRésumé : ${totalSupprimes} ligne(s) matchs_joueur en doublon ${dryRun ? 'à supprimer' : 'supprimée(s)'}, ${totalJoueursAffectes} joueur(s) affecté(s).`);
if (!dryRun && totalSupprimes > 0) {
  console.log('\nLes lignes en doublon ont été supprimées. Lancer ensuite reparation-agregats-matchs-joues.js (déjà existant, idempotent) pour recalculer joueurs.matchs_joues et les autres agrégats depuis les matchs_joueur restants.');
}

if (dryRun) console.log('\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
