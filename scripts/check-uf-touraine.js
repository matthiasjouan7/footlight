// Diagnostic lecture seule : liste les joueurs du club "Union Foot de
// Touraine" (repêché en National 1) avec leur niveau actuel, avant de les
// faire tous passer à N1.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const { data, error } = await supabase
  .from('joueurs')
  .select('id, prenom, nom, club, niveau, saison, poste')
  .ilike('club', '%touraine%');
if (error) { console.error('Erreur lecture :', error.message); process.exit(1); }

console.log(`${data?.length || 0} joueur(s) avec un club contenant "touraine" :\n`);
const parClub = {};
for (const j of data || []) {
  parClub[j.club] = (parClub[j.club] || 0) + 1;
  console.log(`  ${j.prenom} ${j.nom} — club "${j.club}" — niveau "${j.niveau}" — saison ${j.saison} — poste ${j.poste}`);
}
console.log('\nRépartition par club exact :', JSON.stringify(parClub));
