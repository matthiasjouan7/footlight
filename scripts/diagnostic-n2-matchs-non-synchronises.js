// Diagnostic lecture seule : l'utilisateur signale que de nombreux clubs
// (Mulhouse, Onet-le-Château, Steenvoorde, Saint-Étienne, Le Mans,
// Neuilly, Balagne...) restent bloqués à 1 match joué. Liste, pour tous
// les matchs N2 déjà disputés (date <= aujourd'hui) sur l'ensemble des 8
// groupes, le taux de lignes matchs_joueur avec minutes renseignées, pour
// repérer d'un coup tous les matchs encore mal synchronisés plutôt que de
// les traiter un par un.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const SAISON = '2026-2027';
const AUJOURD_HUI = new Date().toISOString().slice(0, 10);

const { data: cal, error } = await supabase
  .from('calendrier_officiel')
  .select('id, groupe, date_match, equipe_domicile, equipe_exterieur')
  .eq('division', 'N2').eq('saison', SAISON).lte('date_match', AUJOURD_HUI)
  .order('date_match');
if (error) { console.error('Erreur :', error.message); process.exit(1); }
console.log(`${(cal || []).length} match(s) N2 déjà disputé(s) (date <= ${AUJOURD_HUI}).\n`);

let totalMj = 0;
const parId = new Map();
for (let i = 0; i < (cal || []).length; i += 50) {
  const lot = cal.slice(i, i + 50);
  const ids = lot.map((c) => c.id);
  const { data: mj, error: errMj } = await supabase.from('matchs_joueur').select('calendrier_officiel_id, minutes_jouees').in('calendrier_officiel_id', ids);
  if (errMj) { console.error('Erreur matchs_joueur :', errMj.message); process.exit(1); }
  for (const m of mj || []) {
    if (!parId.has(m.calendrier_officiel_id)) parId.set(m.calendrier_officiel_id, { total: 0, avecMinutes: 0 });
    const e = parId.get(m.calendrier_officiel_id);
    e.total++;
    if (m.minutes_jouees != null) e.avecMinutes++;
    totalMj++;
  }
}

const problemes = [];
for (const m of cal || []) {
  const e = parId.get(m.id) || { total: 0, avecMinutes: 0 };
  const taux = e.total ? e.avecMinutes / e.total : 0;
  if (taux < 0.9) problemes.push({ ...m, ...e, taux });
}
problemes.sort((a, b) => a.groupe.localeCompare(b.groupe) || new Date(a.date_match) - new Date(b.date_match));

console.log(`${problemes.length} match(s) avec un taux de synchronisation < 90% :\n`);
for (const p of problemes) {
  console.log(`  ${p.date_match} groupe ${p.groupe} — ${p.equipe_domicile} vs ${p.equipe_exterieur} (id=${p.id}) : ${p.avecMinutes}/${p.total} (${Math.round(p.taux * 100)}%)`);
}
