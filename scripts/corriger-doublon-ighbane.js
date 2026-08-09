// Corrige le doublon Ighbane à Toulon : "Noam Ighbane" (ancien import, club
// générique "Toulon", pas de date de naissance) et "Naïm Ighbane" (import
// récent, "Sporting Club de Toulon", date de naissance renseignée) sont la
// même personne. On supprime l'ancienne entrée incomplète.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);

const supabase = createClient(supabaseUrl, supabaseKey);

const ID_A_SUPPRIMER = '817d0c7f-a324-4577-8380-d64febf1603f';

const { data: j, error: jErr } = await supabase.from('joueurs').select('*').eq('id', ID_A_SUPPRIMER).single();
if (jErr) { console.error('Erreur lecture joueur :', jErr.message); process.exit(1); }
console.log(`Joueur à supprimer : ${j.prenom} ${j.nom} | club="${j.club}" | niveau="${j.niveau}" | id=${j.id}`);

if (!dryRun) {
  const { error: delErr } = await supabase.from('joueurs').delete().eq('id', ID_A_SUPPRIMER);
  if (delErr) { console.error('Erreur suppression :', delErr.message); process.exit(1); }
  console.log('\nTerminé.');
} else {
  console.log('\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour appliquer réellement.');
}
