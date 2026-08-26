// Diagnostic lecture seule : vérifie le nombre total de matchs_joueur pour
// Nassim Sabihi après le rattrapage (l'utilisateur s'étonne de "seulement
// 10 matchs insérés" alors que 35 lignes calendrier existent pour son club).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const SABIHI_ID = 'e50df0c5-f81f-4e76-9f4c-efea8d94002d';
const { data, error } = await supabase.from('matchs_joueur').select('id, date_match, adversaire, domicile, calendrier_officiel_id').eq('joueur_id', SABIHI_ID).order('date_match');
if (error) { console.error('Erreur :', error.message); process.exit(1); }
console.log(`Total matchs_joueur pour Sabihi : ${data.length}`);
for (const m of data) console.log(`  ${m.date_match} — vs ${m.adversaire} (${m.domicile ? 'domicile' : 'exterieur'}) — calendrier_officiel_id=${m.calendrier_officiel_id}`);
