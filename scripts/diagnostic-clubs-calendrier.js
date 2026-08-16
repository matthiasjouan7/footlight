// Diagnostic en lecture seule : liste tous les noms de clubs distincts de
// calendrier_officiel pour une division/saison, afin de comparer avec les
// noms utilisés par foot-direct.com et corriger le rapprochement de
// sync-foot-direct-passes.js.
import { createClient } from '@supabase/supabase-js';

const division = process.env.DIVISION || 'Ligue 3';
const groupe = process.env.GROUPE || 'Unique';
const saison = process.env.SAISON;
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!saison) { console.error('SAISON manquant.'); process.exit(1); }
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);
const { data, error } = await supabase.from('calendrier_officiel').select('equipe_domicile, equipe_exterieur').eq('division', division).eq('groupe', groupe).eq('saison', saison);
if (error) { console.error('Erreur :', error.message); process.exit(1); }

const clubs = new Set();
(data || []).forEach((r) => { clubs.add(r.equipe_domicile); clubs.add(r.equipe_exterieur); });
console.log(`${clubs.size} club(s) distinct(s) pour ${division} groupe ${groupe} (${saison}) :\n`);
[...clubs].sort().forEach((c) => console.log(`  "${c}"`));
