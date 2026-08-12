// Complète les stats d'équipe de Luderic Etonde pour la saison 2025/2026 :
// 62 points, 51 buts marqués par l'équipe (National 1 - Groupe A).
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
  points_equipe: 62,
  buts_equipe: 51,
};

const { data: joueurs, error } = await supabase
  .from('joueurs')
  .select('id, prenom, nom, club, niveau, points_equipe, buts_equipe');
if (error) { console.error('Erreur lecture joueurs :', error.message); process.exit(1); }

const cibles = (joueurs || []).filter(
  (j) => normalizeName(j.prenom) === 'luderic' && normalizeName(j.nom) === 'etonde'
);

console.log(`${cibles.length} joueur(s) trouvé(s) "Luderic Etonde" :`);
for (const j of cibles) {
  console.log(`  id=${j.id} | club=${j.club} | niveau=${j.niveau}`);
  console.log(`  avant : points_equipe=${j.points_equipe} buts_equipe=${j.buts_equipe}`);
  console.log(`  après : points_equipe=${STATS.points_equipe} buts_equipe=${STATS.buts_equipe}`);
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
