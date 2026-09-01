// Diagnostic lecture seule : vérifie l'hypothèse de décalage de date pour
// le match FFF "PANAZOL AS" vs "FONTENAY VENDEE" du 2026-08-30 (groupe B),
// non rapproché par correspondance exacte de date_match. Liste toutes les
// lignes calendrier_officiel N2 groupe B impliquant ces deux clubs, quelle
// que soit la date, pour voir si une ligne existe à une date proche.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const { data, error } = await supabase
  .from('calendrier_officiel')
  .select('id, equipe_domicile, equipe_exterieur, date_match, journee')
  .eq('division', 'N2').eq('groupe', 'B').eq('saison', '2026-2027')
  .or('equipe_domicile.ilike.%Panazol%,equipe_exterieur.ilike.%Panazol%,equipe_domicile.ilike.%Fontenay%,equipe_exterieur.ilike.%Fontenay%');
if (error) { console.error('Erreur :', error.message); process.exit(1); }

console.log(`${data.length} ligne(s) calendrier_officiel N2 groupe B impliquant Panazol ou Fontenay :`);
data.forEach((d) => console.log(`  id=${d.id} — ${d.date_match} — J${d.journee} — ${d.equipe_domicile} vs ${d.equipe_exterieur}`));
