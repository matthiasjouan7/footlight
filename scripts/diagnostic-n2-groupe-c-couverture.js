// Diagnostic lecture seule : dans le prolongement du signalement Herman
// Lemaître (Fc St Lo Manche, N2), vérifie l'état de synchronisation
// (minutes_jouees) de TOUS les matchs N2 groupe C (pas seulement ceux de
// St Lo Manche), pour savoir si le problème est spécifique à ce club ou
// touche tout le groupe / toute la division N2.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const SAISON = '2026-2027';

const { data: cal, error: errCal } = await supabase
  .from('calendrier_officiel')
  .select('id, groupe, date_match, equipe_domicile, equipe_exterieur')
  .eq('saison', SAISON).eq('division', 'N2').order('date_match');
if (errCal) { console.error('Erreur calendrier :', errCal.message); process.exit(1); }

const parGroupe = new Map();
for (const r of cal) {
  if (!parGroupe.has(r.groupe)) parGroupe.set(r.groupe, []);
  parGroupe.get(r.groupe).push(r);
}

const ids = cal.map((r) => r.id);
let mj = [];
for (let i = 0; i < ids.length; i += 500) {
  const lot = ids.slice(i, i + 500);
  const { data, error } = await supabase.from('matchs_joueur').select('calendrier_officiel_id, minutes_jouees').in('calendrier_officiel_id', lot);
  if (error) { console.error('Erreur matchs_joueur :', error.message); process.exit(1); }
  mj = mj.concat(data);
}
const statsParId = new Map();
for (const m of mj) {
  const k = m.calendrier_officiel_id;
  if (!statsParId.has(k)) statsParId.set(k, { total: 0, avecMinutes: 0 });
  const s = statsParId.get(k);
  s.total++;
  if (m.minutes_jouees != null) s.avecMinutes++;
}

console.log(`=== Couverture matchs_joueur par groupe N2 (saison ${SAISON}) ===\n`);
for (const [groupe, lignes] of [...parGroupe.entries()].sort()) {
  const passes = new Date();
  const lignesPassees = lignes.filter((r) => new Date(r.date_match) <= passes);
  let matchsAvecAuMoinsUneStat = 0, matchsPasses = lignesPassees.length;
  for (const r of lignesPassees) {
    const s = statsParId.get(r.id) || { total: 0, avecMinutes: 0 };
    if (s.avecMinutes > 0) matchsAvecAuMoinsUneStat++;
  }
  console.log(`Groupe ${groupe} : ${lignes.length} match(s) au total, ${matchsPasses} déjà joué(s) (date <= aujourd'hui), ${matchsAvecAuMoinsUneStat}/${matchsPasses} avec au moins 1 joueur ayant des minutes_jouees.`);
}

console.log('\n=== Détail groupe C (clubs présents, échantillon 15 lignes) ===');
const lignesC = parGroupe.get('C') || [];
for (const r of lignesC.slice(0, 15)) {
  const s = statsParId.get(r.id) || { total: 0, avecMinutes: 0 };
  console.log(`  id=${r.id} (${r.date_match}) "${r.equipe_domicile}" vs "${r.equipe_exterieur}" : ${s.avecMinutes}/${s.total} avec minutes`);
}
