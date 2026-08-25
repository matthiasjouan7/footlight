// Diagnostic lecture seule : nettoyer-ambiguites-n1.js rapporte "0
// matchs_joueur" pour les lignes orphelines mais leur suppression échoue
// systématiquement par contrainte de clé étrangère. Ce script interroge
// directement matchs_joueur pour quelques ids précis, sans passer par le
// filtre .in() combiné, pour voir ce qui bloque réellement.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const IDS_A_VERIFIER = [2747, 2753, 2754, 2790, 3037, 3035, 3034, 3032, 3031, 3033];

for (const id of IDS_A_VERIFIER) {
  const { data, error, count } = await supabase
    .from('matchs_joueur')
    .select('id, joueur_id, calendrier_officiel_id', { count: 'exact' })
    .eq('calendrier_officiel_id', id);
  if (error) { console.error(`Erreur pour id=${id} :`, error.message); continue; }
  console.log(`calendrier_officiel_id=${id} : ${count} matchs_joueur (requête .eq)`);
  for (const m of data || []) console.log(`  id=${m.id} joueur_id=${m.joueur_id}`);
}

console.log('\n--- Requête .in() combinée (comme dans le script de nettoyage) ---');
const { data: dataIn, error: errIn } = await supabase
  .from('matchs_joueur')
  .select('id, joueur_id, calendrier_officiel_id')
  .in('calendrier_officiel_id', IDS_A_VERIFIER);
if (errIn) console.error('Erreur .in() :', errIn.message);
else {
  console.log(`${dataIn.length} ligne(s) trouvée(s) via .in().`);
  for (const m of dataIn) console.log(`  id=${m.id} joueur_id=${m.joueur_id} calendrier_officiel_id=${m.calendrier_officiel_id} (type=${typeof m.calendrier_officiel_id})`);
}
