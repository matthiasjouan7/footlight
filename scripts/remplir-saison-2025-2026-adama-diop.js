// Ajoute la saison 2025/2026 d'Adama Diop (Bordeaux, National 1 - Groupe
// A), fournie par l'utilisateur via capture d'écran du site officiel.
// La saison courante de l'app est 2026/2027 (il est actuellement libre,
// sans club) : ces stats vont donc dans stats_saisons, pas sur la ligne
// joueurs courante.
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

const SAISON = '2025-2026';
const STATS = {
  club: 'Bordeaux',
  niveau: 'N1',
  matchs_joues: 24,
  titularisations: 18,
  matchs_remplacant: 2,
  buts: 0,
  passes_decisives: 0,
  cartons_jaunes: 3,
  cartons_rouges: 0,
  minutes_jouees: 1534,
  points_equipe: 62,
  buts_equipe: 51,
  buts_encaisses_equipe: 28,
};

const { data: joueurs, error } = await supabase.from('joueurs').select('id, prenom, nom');
if (error) { console.error('Erreur lecture joueurs :', error.message); process.exit(1); }

const cible = (joueurs || []).find(
  (j) => normalizeName(j.prenom) === 'adama' && normalizeName(j.nom) === 'diop'
);
if (!cible) { console.error('Joueur "Adama Diop" introuvable.'); process.exit(1); }

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
