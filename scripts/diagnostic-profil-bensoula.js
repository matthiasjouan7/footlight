// Diagnostic lecture seule : vérifie l'état final du profil de Kamil
// Bensoula après génération du calendrier + synchro stats L'Équipe.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const JOUEUR_ID = '0420f770-0ed6-492b-a517-42ff8283b167';
const { data: j } = await supabase.from('joueurs').select('*').eq('id', JOUEUR_ID).single();
console.log('Joueur :', JSON.stringify(j, null, 2));

const { data: mj } = await supabase.from('matchs_joueur').select('date_match, adversaire, domicile, score_pour, score_contre, buts, passes_decisives, cartons_jaunes, minutes_jouees').eq('joueur_id', JOUEUR_ID).order('date_match', { ascending: true });
console.log(`\n${mj.length} ligne(s) matchs_joueur :`);
for (const m of mj) console.log(`  ${m.date_match} vs ${m.adversaire} (${m.domicile ? 'dom' : 'ext'}) — score ${m.score_pour ?? '?'}-${m.score_contre ?? '?'} — buts=${m.buts ?? 0} pd=${m.passes_decisives ?? 0} cj=${m.cartons_jaunes ?? 0} min=${m.minutes_jouees ?? '?'}`);
