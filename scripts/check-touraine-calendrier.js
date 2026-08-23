// Diagnostic lecture seule : la synchro quotidienne lequipe.fr tourne
// depuis plusieurs jours (252 lignes groupe C désormais, contre 244
// initialement) — vérifie si elle a déjà rattrapé le repêchage d'Union
// Foot de Touraine (poule à 17 équipes) avant d'importer les données FFF.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const { data, error } = await supabase
  .from('calendrier_officiel')
  .select('id, equipe_domicile, equipe_exterieur, date_match, journee')
  .eq('division', 'N1')
  .eq('saison', '2026-2027')
  .eq('groupe', 'C')
  .order('date_match', { ascending: true });
if (error) { console.error('Erreur lecture :', error.message); process.exit(1); }

console.log(`${data?.length || 0} ligne(s) groupe C.`);

const equipes = new Set();
for (const m of data || []) {
  equipes.add(m.equipe_domicile);
  equipes.add(m.equipe_exterieur);
}
console.log(`\nÉquipes distinctes (${equipes.size}) :`);
console.log([...equipes].sort().join('\n'));

const touraine = (data || []).filter((m) => `${m.equipe_domicile} ${m.equipe_exterieur}`.toLowerCase().includes('touraine'));
console.log(`\nLignes mentionnant "Touraine" : ${touraine.length}`);
for (const m of touraine) console.log(`  ${m.date_match} — J${m.journee} — ${m.equipe_domicile} vs ${m.equipe_exterieur}`);

const parJournee = {};
for (const m of data || []) {
  parJournee[m.journee] = (parJournee[m.journee] || 0) + 1;
}
console.log('\nMatchs par journée :', JSON.stringify(parJournee));
