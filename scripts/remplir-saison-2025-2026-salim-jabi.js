// Ajoute la saison 2025/2026 de Salim Jabi (National 1 - Groupe A),
// fournie par l'utilisateur via capture d'écran du site officiel.
// Particularité : deux clubs dans la saison (FC Chauray puis Angoulême
// Charente FC). Le schéma stats_saisons n'a qu'une ligne par saison
// (contrainte joueur_id+saison) : on utilise donc les totaux "Compact"
// de la saison (identiques à ceux affichés groupés sur le site) avec un
// nom de club qui mentionne les deux clubs.
//
// La saison courante de l'app est 2026/2027 (il est actuellement
// libre) : ces stats vont dans stats_saisons, pas sur la ligne joueurs
// courante.
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
  club: 'FC Chauray puis Angoulême Charente FC',
  niveau: 'N1',
  matchs_joues: 24,
  titularisations: 10,
  matchs_remplacant: 3,
  buts: 1,
  passes_decisives: 0,
  cartons_jaunes: 2,
  cartons_rouges: 0,
  minutes_jouees: 999,
};

const { data: joueurs, error } = await supabase.from('joueurs').select('id, prenom, nom');
if (error) { console.error('Erreur lecture joueurs :', error.message); process.exit(1); }

const cible = (joueurs || []).find(
  (j) => normalizeName(j.prenom) === 'salim' && normalizeName(j.nom) === 'jabi'
);
if (!cible) { console.error('Joueur "Salim Jabi" introuvable.'); process.exit(1); }

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
