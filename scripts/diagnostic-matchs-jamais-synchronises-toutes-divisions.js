// Diagnostic lecture seule, toutes divisions confondues (N1 A/B/C,
// National 2 A-H, Ligue 3) : liste tous les matchs passés
// (date_match <= aujourd'hui) qui n'ont AUCUNE ligne matchs_joueur avec
// minutes_jouees renseignée — le signal le plus fiable qu'un match n'a
// jamais été synchronisé, quelle que soit la source (lequipe.fr,
// Transfermarkt, FFF), indépendamment du roster de chaque joueur.
//
// Suite au correctif de l'extraction des compositions Transfermarkt N2
// (aufstellung-box / lien profil joueur au lieu des <table>), pour
// vérifier objectivement quels clubs restent bloqués partout, pas
// seulement Alençon.
//
// Pagination systématique (.range()) pour éviter la troncature par
// défaut de Supabase (~1000 lignes), déjà rencontrée plusieurs fois
// (Balagne, Hyères...).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const SAISON = '2026-2027';
const AUJOURD_HUI = new Date().toISOString().slice(0, 10);
const PAGE_SIZE = 1000;

async function fetchAll(table, select, filtreFn) {
  let all = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let q = supabase.from(table).select(select).eq('saison', SAISON).range(from, from + PAGE_SIZE - 1);
    if (filtreFn) q = filtreFn(q);
    const { data, error } = await q;
    if (error) { console.error(`Erreur lecture ${table} :`, error.message); process.exit(1); }
    if (!data || !data.length) break;
    all = all.concat(data);
    if (data.length < PAGE_SIZE) break;
  }
  return all;
}

console.log(`Saison ${SAISON}, matchs jusqu'au ${AUJOURD_HUI} inclus.\n`);

const calendrier = await fetchAll(
  'calendrier_officiel',
  'id, division, groupe, date_match, journee, equipe_domicile, equipe_exterieur',
  (q) => q.lte('date_match', AUJOURD_HUI)
);
console.log(`${calendrier.length} match(s) passé(s) au total (toutes divisions confondues).`);

const matchsAvecMinutes = await fetchAll(
  'matchs_joueur',
  'calendrier_officiel_id',
  (q) => q.not('minutes_jouees', 'is', null).not('calendrier_officiel_id', 'is', null)
);
const idsSynchronises = new Set(matchsAvecMinutes.map((m) => m.calendrier_officiel_id));
console.log(`${idsSynchronises.size} match(s) distinct(s) avec au moins une ligne matchs_joueur renseignée.\n`);

const jamaisSynchro = calendrier.filter((c) => !idsSynchronises.has(c.id));
console.log(`${jamaisSynchro.length} match(s) passé(s) SANS AUCUNE stat synchronisée.\n`);

// Regroupe par division+groupe pour lisibilité.
const parGroupe = new Map();
for (const m of jamaisSynchro) {
  const cle = `${m.division || '?'} ${m.groupe || '?'}`;
  if (!parGroupe.has(cle)) parGroupe.set(cle, []);
  parGroupe.get(cle).push(m);
}
for (const [cle, matchs] of [...parGroupe.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  console.log(`--- ${cle} : ${matchs.length} match(s) jamais synchronisé(s) ---`);
  for (const m of matchs.sort((a, b) => (a.journee || 0) - (b.journee || 0))) {
    console.log(`  J${m.journee ?? '?'} ${m.date_match} — "${m.equipe_domicile}" vs "${m.equipe_exterieur}" (id=${m.id})`);
  }
}

// Liste des clubs distincts impliqués, pour un résumé rapide.
const clubs = new Set();
for (const m of jamaisSynchro) { clubs.add(m.equipe_domicile); clubs.add(m.equipe_exterieur); }
console.log(`\n${clubs.size} club(s) distinct(s) impliqué(s) dans au moins un match jamais synchronisé :`);
console.log([...clubs].sort().join(', '));
