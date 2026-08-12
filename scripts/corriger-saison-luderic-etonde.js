// Les stats déjà écrites sur la ligne "joueurs" de Luderic Etonde (26
// matchs, 10 buts, 62 pts équipe, 51 buts équipe...) sont celles de la
// saison 2025/2026, pas de la saison "courante" par défaut (2026-2027).
// Ce script pose explicitement joueur.saison = '2025-2026' pour que ces
// stats s'affichent sous le bon libellé de saison.
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
  .select('id, prenom, nom, saison, matchs_joues, buts');
if (error) { console.error('Erreur lecture joueurs :', error.message); process.exit(1); }

const cibles = (joueurs || []).filter(
  (j) => normalizeName(j.prenom) === 'luderic' && normalizeName(j.nom) === 'etonde'
);

console.log(`${cibles.length} joueur(s) trouvé(s) "Luderic Etonde" :`);
for (const j of cibles) {
  console.log(`  id=${j.id} | saison actuelle="${j.saison}" | matchs=${j.matchs_joues} buts=${j.buts}`);
  console.log(`  après : saison="2025-2026"`);
}

if (!dryRun) {
  for (const j of cibles) {
    const { error: updErr } = await supabase.from('joueurs').update({ saison: '2025-2026' }).eq('id', j.id);
    if (updErr) { console.error(`Erreur mise à jour ${j.prenom} ${j.nom} :`, updErr.message); process.exit(1); }
  }
  console.log('\nTerminé.');
} else {
  console.log('\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour appliquer réellement.');
}
