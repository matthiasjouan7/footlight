// Diagnostic lecture seule : la ligne calendrier_officiel id=3042 ("Orléans
// vs La Roche-sur-Yon", 2026-08-27) est un doublon du vrai match officiel
// id=1966 ("US ORLEANS vs VENDEE FC LA ROCHE/YON", 2026-08-29, journée 4) —
// même schéma que les doublons N1 déjà nettoyés cette session (créés par
// sync-lequipe-to-calendrier.js : nom court lequipe.fr, mauvaise date pour
// une journée à dates multiples, id en plage haute). Vérifie si d'autres
// joueurs que Kamil Bensoula sont liés à ce doublon avant suppression.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const { data: mj, error } = await supabase
  .from('matchs_joueur')
  .select('id, joueur_id, date_match, calendrier_officiel_id')
  .eq('calendrier_officiel_id', 3042);
if (error) { console.error('Erreur :', error.message); process.exit(1); }
console.log(`${mj.length} ligne(s) matchs_joueur liée(s) au doublon id=3042 :`);
for (const m of mj) {
  const { data: j } = await supabase.from('joueurs').select('prenom, nom').eq('id', m.joueur_id).single();
  console.log(`  ${j?.prenom} ${j?.nom} (matchs_joueur id=${m.id})`);
}

// Confirme aussi que le vrai match (id=1966) existe bien et n'a pas déjà
// de score/joueurs liés qui seraient perdus par erreur.
const { data: officiel } = await supabase.from('calendrier_officiel').select('*').eq('id', 1966).single();
console.log('\nLigne officielle (id=1966) :', JSON.stringify(officiel));
const { data: mjOfficiel } = await supabase.from('matchs_joueur').select('id, joueur_id').eq('calendrier_officiel_id', 1966);
console.log(`${mjOfficiel?.length || 0} ligne(s) matchs_joueur déjà liée(s) au vrai match (id=1966).`);
