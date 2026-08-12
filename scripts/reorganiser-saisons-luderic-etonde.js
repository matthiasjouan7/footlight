// Réorganise les saisons de Luderic Etonde :
//
// 1) La saison en cours du club (National 1 - Groupe A, 26 matchs, 10
//    buts...) avait été écrite par erreur comme "saison courante" sur la
//    ligne joueurs. Or la saison courante est 2026/2027, et il n'a
//    actuellement PAS de club (libre). Ces stats sont en réalité celles
//    de la saison 2025/2026, à Bordeaux : on les déplace vers
//    stats_saisons (saison=2025-2026, club=Bordeaux) et on réinitialise
//    la ligne joueurs pour refléter qu'il est libre sur 2026/2027.
//
// 2) La ligne stats_saisons 2024-2025 (Les Herbiers Vendée Foot)
//    contenait une valeur de titularisations obsolète (29, restée d'une
//    ancienne donnée de seed) alors que le joueur n'a joué que 18
//    matchs cette saison-là. Le site officiel indique "Onze de départ:
//    16, Entré en jeu: 1" : on corrige titularisations=16 et
//    matchs_remplacant=1.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);

const supabase = createClient(supabaseUrl, supabaseKey);

function normalizeName(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}

const { data: joueurs, error } = await supabase
  .from('joueurs')
  .select('id, prenom, nom, saison, club, matchs_joues, buts, passes_decisives, cartons_jaunes, cartons_rouges, minutes_jouees, buts_equipe, points_equipe');
if (error) { console.error('Erreur lecture joueurs :', error.message); process.exit(1); }

const cible = (joueurs || []).find(
  (j) => normalizeName(j.prenom) === 'luderic' && normalizeName(j.nom) === 'etonde'
);
if (!cible) { console.error('Joueur introuvable.'); process.exit(1); }

console.log('Ligne joueurs actuelle :', cible);

const SAISON_2025_2026 = {
  club: 'Bordeaux',
  niveau: 'N1',
  matchs_joues: cible.matchs_joues,
  buts: cible.buts,
  passes_decisives: cible.passes_decisives,
  cartons_jaunes: cible.cartons_jaunes,
  cartons_rouges: cible.cartons_rouges,
  minutes_jouees: cible.minutes_jouees,
  buts_equipe: cible.buts_equipe,
  points_equipe: cible.points_equipe,
};

const RESET_JOUEUR = {
  saison: '2026-2027',
  matchs_joues: 0,
  titularisations: 0,
  matchs_remplacant: 0,
  buts: 0,
  passes_decisives: 0,
  cartons_jaunes: 0,
  cartons_rouges: 0,
  minutes_jouees: 0,
  buts_equipe: null,
  points_equipe: null,
};

console.log('\n1) Nouvelle ligne stats_saisons "2025-2026" à créer :', SAISON_2025_2026);
console.log('\n2) Ligne joueurs (saison courante 2026-2027) réinitialisée :', RESET_JOUEUR);
console.log('\n3) Correction stats_saisons "2024-2025" : titularisations=16, matchs_remplacant=1 (au lieu de 29/null)');

if (!dryRun) {
  const { error: upErr } = await supabase
    .from('stats_saisons')
    .upsert({ joueur_id: cible.id, saison: '2025-2026', ...SAISON_2025_2026 }, { onConflict: 'joueur_id,saison' });
  if (upErr) { console.error('Erreur upsert 2025-2026 :', upErr.message); process.exit(1); }

  const { error: resetErr } = await supabase.from('joueurs').update(RESET_JOUEUR).eq('id', cible.id);
  if (resetErr) { console.error('Erreur reset joueurs :', resetErr.message); process.exit(1); }

  const { error: fixErr } = await supabase
    .from('stats_saisons')
    .update({ titularisations: 16, matchs_remplacant: 1 })
    .eq('joueur_id', cible.id)
    .eq('saison', '2024-2025');
  if (fixErr) { console.error('Erreur correction 2024-2025 :', fixErr.message); process.exit(1); }

  console.log('\nTerminé.');
} else {
  console.log('\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour appliquer réellement.');
}
