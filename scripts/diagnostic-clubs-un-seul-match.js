// Diagnostic lecture seule : l'utilisateur signale que des joueurs de
// certains clubs N1 (Locminé, Nîmes, Fréjus, potentiellement d'autres)
// n'ont qu'un seul match dans leur calendrier — même symptôme que FC
// Limonest avant son rattrapage (une seule ligne dans tout
// calendrier_officiel, car le rapprochement club échouait pour ce club
// spécifique, laissant son calendrier passé jamais rattrapé par le cron
// quotidien qui ne synchronise que la journée courante).
//
// Vérifie, pour chaque club suspecté, combien de lignes matchs_joueur
// existent par joueur, et scanne plus largement tous les joueurs N1 pour
// détecter systématiquement d'autres clubs dans le même cas (peu de
// matchs alors que plusieurs journées ont déjà été jouées).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const SAISON = '2026-2027';
const CLUBS_SUSPECTES = ['Locminé', 'Nîmes', 'Fréjus'];

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
  const joueurs = await fetchToutesPages('joueurs', 'id, prenom, nom, club, niveau', (q) => q.eq('niveau', 'N1').eq('saison', SAISON));
  console.log(`${joueurs.length} joueur(s) N1 saison ${SAISON}.\n`);

  console.log('--- Clubs suspectés (recherche large ilike) ---');
  for (const nomClub of CLUBS_SUSPECTES) {
    const correspondants = joueurs.filter((j) => j.club && j.club.toLowerCase().includes(nomClub.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')) || (j.club || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().includes(nomClub.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()));
    const clubsUniques = [...new Set(correspondants.map((j) => j.club))];
    console.log(`\n"${nomClub}" -> club(s) trouvé(s) : ${JSON.stringify(clubsUniques)}, ${correspondants.length} joueur(s)`);
    if (!correspondants.length) continue;
    const ids = correspondants.map((j) => j.id);
    const { data: mj, error } = await supabase.from('matchs_joueur').select('joueur_id').in('joueur_id', ids);
    if (error) { console.log(`  Erreur matchs_joueur : ${error.message}`); continue; }
    const parJoueur = new Map();
    for (const m of mj) parJoueur.set(m.joueur_id, (parJoueur.get(m.joueur_id) || 0) + 1);
    for (const j of correspondants.slice(0, 5)) {
      console.log(`  ${j.prenom} ${j.nom} (${j.club}) : ${parJoueur.get(j.id) || 0} ligne(s) matchs_joueur`);
    }
  }

  console.log('\n\n--- Scan systémique : clubs N1 avec très peu de matchs en moyenne ---');
  const idsTous = joueurs.map((j) => j.id);
  const mjTous = await fetchToutesPages('matchs_joueur', 'joueur_id', (q) => q.in('joueur_id', idsTous.slice(0, 1000)));
  // (Limité à 1000 joueurs pour rester rapide ; N1 est une division plus petite que N2.)
  const compteParJoueur = new Map();
  for (const m of mjTous) compteParJoueur.set(m.joueur_id, (compteParJoueur.get(m.joueur_id) || 0) + 1);

  const parClub = new Map();
  for (const j of joueurs.slice(0, 1000)) {
    if (!parClub.has(j.club)) parClub.set(j.club, []);
    parClub.get(j.club).push(compteParJoueur.get(j.id) || 0);
  }
  const moyenneParClub = [...parClub.entries()].map(([club, comptes]) => ({
    club, moyenne: comptes.reduce((a, b) => a + b, 0) / comptes.length, nbJoueurs: comptes.length,
  })).sort((a, b) => a.moyenne - b.moyenne);

  console.log('Les 15 clubs avec la moyenne de matchs_joueur la plus basse :');
  moyenneParClub.slice(0, 15).forEach((c) => console.log(`  ${c.club} : moyenne ${c.moyenne.toFixed(1)} (${c.nbJoueurs} joueur(s))`));
}

main().finally(() => process.exit(process.exitCode || 0));
