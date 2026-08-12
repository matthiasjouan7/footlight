// Remplit les statistiques de la saison 2025/2026 de Luderic Etonde
// (National 1 - Groupe A), fournies par l'utilisateur via capture d'écran
// du site officiel : 26 matchs joués, 10 buts, 0 passe décisive,
// 3 cartons jaunes, 1 carton rouge, 2068 minutes jouées.
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

const STATS = {
  matchs_joues: 26,
  buts: 10,
  passes_decisives: 0,
  cartons_jaunes: 3,
  cartons_rouges: 1,
  minutes_jouees: 2068,
};

const { data: joueurs, error } = await supabase
  .from('joueurs')
  .select('id, prenom, nom, poste, club, niveau, matchs_joues, buts, passes_decisives, cartons_jaunes, cartons_rouges, minutes_jouees');
if (error) { console.error('Erreur lecture joueurs :', error.message); process.exit(1); }

const cibles = (joueurs || []).filter(
  (j) => normalizeName(j.prenom) === 'luderic' && normalizeName(j.nom) === 'etonde'
);

console.log(`${cibles.length} joueur(s) trouvé(s) "Luderic Etonde" :`);
for (const j of cibles) {
  console.log(`  id=${j.id} | club=${j.club} | niveau=${j.niveau}`);
  console.log(`  avant : matchs=${j.matchs_joues} buts=${j.buts} passes=${j.passes_decisives} cartj=${j.cartons_jaunes} cartr=${j.cartons_rouges} minutes=${j.minutes_jouees}`);
  console.log(`  après : matchs=${STATS.matchs_joues} buts=${STATS.buts} passes=${STATS.passes_decisives} cartj=${STATS.cartons_jaunes} cartr=${STATS.cartons_rouges} minutes=${STATS.minutes_jouees}`);
}

if (!dryRun) {
  for (const j of cibles) {
    const { error: updErr } = await supabase.from('joueurs').update(STATS).eq('id', j.id);
    if (updErr) { console.error(`Erreur mise à jour ${j.prenom} ${j.nom} :`, updErr.message); process.exit(1); }
  }
  console.log('\nTerminé.');
} else {
  console.log('\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour appliquer réellement.');
}
