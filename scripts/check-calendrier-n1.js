// Diagnostic lecture seule : vérifie l'état de calendrier_officiel pour
// National 1 (saison 2026-2027) — le premier run réel du cron
// sync-foot-direct-passes.js sur National 1 n'a trouvé AUCUNE
// correspondance (0 candidat(s) à chaque fois), ce qui peut signifier soit
// un problème de rapprochement de noms de clubs, soit que calendrier_officiel
// ne contient tout simplement pas encore les matchs de la journée 1 (vendredi
// 21/08) pour cette division.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const { data, error } = await supabase
  .from('calendrier_officiel')
  .select('id, equipe_domicile, equipe_exterieur, date_match, groupe, journee')
  .eq('division', 'N1')
  .eq('saison', '2026-2027')
  .order('date_match', { ascending: true });
if (error) { console.error('Erreur lecture :', error.message); process.exit(1); }

console.log(`${data?.length || 0} ligne(s) calendrier_officiel pour National 1 (2026-2027).\n`);

const parGroupe = {};
for (const m of data || []) {
  parGroupe[m.groupe] = (parGroupe[m.groupe] || 0) + 1;
}
console.log('Répartition par groupe :', JSON.stringify(parGroupe));

const dates = [...new Set((data || []).map((m) => m.date_match))].sort();
console.log(`\nDates présentes (${dates.length}) : ${dates.slice(0, 15).join(', ')}${dates.length > 15 ? '…' : ''}`);

console.log('\n10 premières lignes :');
for (const m of (data || []).slice(0, 10)) {
  console.log(`  ${m.date_match} — J${m.journee} groupe ${m.groupe} — ${m.equipe_domicile} vs ${m.equipe_exterieur}`);
}
