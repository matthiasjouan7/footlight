import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data } = await supabase.from('joueurs').select('id, prenom, nom, club, niveau, saison').eq('club', 'F.C.Balagne 1').limit(5);
console.log(JSON.stringify(data, null, 2));
