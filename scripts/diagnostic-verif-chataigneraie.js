// Diagnostic lecture seule : vérifie l'état réel de l'effectif AS La
// Châtaigneraie après l'exécution d'ajouter-effectif-chataigneraie.js, qui
// a rencontré des erreurs de doublon d'email (joueurs déjà en base non
// détectés par l'anti-doublon par nom, probablement à cause de la
// pagination par défaut de PostgREST sur la lecture complète de la table
// joueurs).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const { count, error: countErr } = await supabase
  .from('joueurs')
  .select('id', { count: 'exact', head: true });
if (countErr) { console.error('Erreur count joueurs :', countErr.message); process.exit(1); }
console.log(`Total joueurs en base : ${count}`);

const { data, error } = await supabase
  .from('joueurs')
  .select('id, prenom, nom, club, email, created_at')
  .ilike('club', '%chataigneraie%')
  .order('created_at', { ascending: true });
if (error) { console.error('Erreur lecture joueurs :', error.message); process.exit(1); }

console.log(`\n"AS La Châtaigneraie" : ${data?.length || 0} joueur(s) en base.`);
for (const j of data || []) {
  console.log(`  - ${j.prenom} ${j.nom} (id=${j.id}, créé le ${j.created_at})`);
}
