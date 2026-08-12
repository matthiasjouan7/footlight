// Corrige le poste de Salim Jabi (vide en base) en "milieu_central".
// Affiche un aperçu avant toute écriture.
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
  .select('id, prenom, nom, poste, club, niveau');
if (error) { console.error('Erreur lecture joueurs :', error.message); process.exit(1); }

const cibles = (joueurs || []).filter(
  (j) => normalizeName(j.prenom) === 'salim' && normalizeName(j.nom) === 'jabi'
);

console.log(`${cibles.length} joueur(s) trouvé(s) "Salim Jabi" :`);
for (const j of cibles) console.log(`  id=${j.id} | poste actuel="${j.poste}" | club=${j.club} | niveau=${j.niveau}`);

if (!dryRun) {
  for (const j of cibles) {
    const { error: updErr } = await supabase.from('joueurs').update({ poste: 'milieu_central' }).eq('id', j.id);
    if (updErr) { console.error(`Erreur mise à jour ${j.prenom} ${j.nom} :`, updErr.message); process.exit(1); }
  }
  console.log('\nTerminé.');
} else {
  console.log('\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour appliquer réellement.');
}
