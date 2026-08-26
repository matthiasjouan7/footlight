// Diagnostic lecture seule : quel est le vrai groupe/journée déclaré en
// base pour la ligne calendrier_officiel id=2800 (Hyères vs Limonest) ?
// Le diagnostic précédent (groupe B) n'a pas trouvé ce match sur la page
// lequipe.fr correspondante — vérifie si le groupe en base diffère.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const { data, error } = await supabase
  .from('calendrier_officiel')
  .select('id, saison, division, groupe, journee, date_match, equipe_domicile, equipe_exterieur')
  .eq('id', 2800)
  .single();
if (error) { console.error('Erreur :', error.message); process.exit(1); }
console.log(JSON.stringify(data, null, 2));
