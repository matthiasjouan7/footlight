// Diagnostic lecture seule : l'utilisateur signale que "tous les matchs
// N2 en général" ne s'actualisent pas sur le site. Le pipeline de synchro
// calendrier/stats tourne bien chaque jour (vérifié), donc le problème
// est probablement le même que pour Hyères/Limonest : matchs_joues reste
// à 0 pour beaucoup de joueurs, soit parce que lequipe.fr n'a pas de
// feuille de match détaillée pour la plupart des matchs N2 (repli DOM
// score-seul, qui n'écrit jamais minutes_jouees), soit — depuis le
// correctif du bug de lien match-direct partagé — parce que le script
// ignore désormais prudemment les matchs sans lien propre au lieu
// d'écrire de mauvaises données (ce qui limite fortement la couverture
// réelle en N2, où peu de matchs semblent avoir un lien individuel).
//
// Calcule, pour tous les joueurs N2 de la saison en cours : combien ont
// matchs_joues=0 malgré au moins une ligne matchs_joueur avec
// calendrier_officiel_id renseigné (donc un calendrier généré) dont la
// date est déjà passée.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const SAISON = '2026-2027';
const AUJOURD_HUI = '2026-08-31';

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

async function main() {
  const joueurs = await fetchToutesPages('joueurs', 'id, prenom, nom, club, matchs_joues', (q) => q.eq('niveau', 'N2').eq('saison', SAISON));
  console.log(`${joueurs.length} joueur(s) N2 saison ${SAISON}.`);

  const zero = joueurs.filter((j) => !j.matchs_joues || j.matchs_joues === 0);
  console.log(`${zero.length} joueur(s) à matchs_joues=0 (${Math.round((zero.length / joueurs.length) * 100)}%).`);

  const idsZero = zero.map((j) => j.id);
  const mj = await fetchToutesPages('matchs_joueur', 'joueur_id, calendrier_officiel_id, date_match, minutes_jouees', (q) => q.in('joueur_id', idsZero.slice(0, 1000)).lte('date_match', AUJOURD_HUI));
  console.log(`\nParmi un échantillon de ${Math.min(idsZero.length, 1000)} joueurs à 0, ${mj.length} ligne(s) matchs_joueur avec une date déjà passée (${AUJOURD_HUI}) trouvée(s).`);
  const avecCalendrierMaisPasJoue = mj.filter((m) => m.calendrier_officiel_id != null && m.minutes_jouees == null);
  console.log(`${avecCalendrierMaisPasJoue.length} ligne(s) : calendrier généré (calendrier_officiel_id renseigné) pour un match déjà passé, mais minutes_jouees toujours null.`);

  const joueursConcernes = new Set(avecCalendrierMaisPasJoue.map((m) => m.joueur_id));
  console.log(`=> ${joueursConcernes.size} joueur(s) distinct(s) dans l'échantillon ont au moins un match déjà joué sans stats synchronisées.`);

  console.log('\n--- Répartition par club (10 premiers) ---');
  const parClub = new Map();
  for (const j of zero) {
    if (!joueursConcernes.has(j.id)) continue;
    parClub.set(j.club, (parClub.get(j.club) || 0) + 1);
  }
  [...parClub.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([club, n]) => console.log(`  ${club} : ${n} joueur(s)`));
}

main().finally(() => process.exit(process.exitCode || 0));
