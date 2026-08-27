// Diagnostic lecture seule : GFC Ajaccio créé (25 joueurs) mais 0 match
// trouvé dans le calendrier N2 groupe H — liste tous les clubs distincts
// du groupe H pour retrouver le vrai nom utilisé par calendrier_officiel
// (probablement une orthographe différente de "Gfc Ajaccio").
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const { data, error } = await supabase
  .from('calendrier_officiel')
  .select('equipe_domicile, equipe_exterieur')
  .eq('division', 'N2')
  .eq('groupe', 'H')
  .eq('saison', '2026-2027');
if (error) { console.error('Erreur :', error.message); process.exit(1); }
const clubs = [...new Set(data.flatMap((r) => [r.equipe_domicile, r.equipe_exterieur]))].sort();
console.log(`${clubs.length} club(s) distinct(s) en N2 groupe H :`);
for (const c of clubs) console.log(`  "${c}"`);
