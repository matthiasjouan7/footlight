// Ajoute la saison historique 2024/2025 de Luderic Etonde (Les Herbiers
// Vendée Foot, National 1 - Groupe B), fournie par l'utilisateur via
// capture d'écran du site officiel. Il n'a pas joué la saison complète
// (arrivée en cours de saison, à partir de la journée 12).
//
// Écrit dans stats_saisons (upsert sur joueur_id + saison), et non dans
// joueurs, car ce n'est pas la saison en cours.
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

const SAISON = '2024-2025';
const STATS = {
  club: 'Les Herbiers Vendée Foot',
  niveau: 'N1',
  matchs_joues: 18,
  buts: 6,
  passes_decisives: 4,
  cartons_jaunes: 2,
  cartons_rouges: 0,
  minutes_jouees: 1288,
  buts_equipe: 37,
};

const { data: joueurs, error } = await supabase
  .from('joueurs')
  .select('id, prenom, nom')
  .then((r) => r);
if (error) { console.error('Erreur lecture joueurs :', error.message); process.exit(1); }

const cible = (joueurs || []).find(
  (j) => normalizeName(j.prenom) === 'luderic' && normalizeName(j.nom) === 'etonde'
);
if (!cible) { console.error('Joueur "Luderic Etonde" introuvable.'); process.exit(1); }

console.log(`Joueur trouvé : id=${cible.id}`);
console.log(`Saison ${SAISON} à écrire :`, STATS);

const { data: existant } = await supabase
  .from('stats_saisons')
  .select('*')
  .eq('joueur_id', cible.id)
  .eq('saison', SAISON)
  .maybeSingle();
console.log('Ligne existante pour cette saison :', existant || '(aucune)');

if (!dryRun) {
  const { error: upErr } = await supabase
    .from('stats_saisons')
    .upsert({ joueur_id: cible.id, saison: SAISON, ...STATS }, { onConflict: 'joueur_id,saison' });
  if (upErr) { console.error('Erreur upsert stats_saisons :', upErr.message); process.exit(1); }
  console.log('\nTerminé.');
} else {
  console.log('\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour appliquer réellement.');
}
