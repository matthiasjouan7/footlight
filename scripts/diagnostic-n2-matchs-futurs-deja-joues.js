// Diagnostic lecture seule : l'utilisateur signale des matchs datés du
// 19/09 (futur — aujourd'hui est le 08/09) déjà marqués comme joués
// (minutes_jouees renseigné). Si confirmé, c'est un bug distinct et plus
// fondamental que les précédents : les scripts de synchro Transfermarkt
// n'ont aucun garde-fou empêchant d'écrire des stats pour un match dont la
// date est dans le futur — probablement parce que Transfermarkt publie des
// "compositions probables" (prévisionnelles) pour les matchs à venir, que
// le script traite comme une vraie composition de match terminé.
//
// Repère TOUTES les lignes calendrier_officiel N2 dont la date est dans le
// futur mais qui ont pourtant des matchs_joueur avec minutes_jouees
// renseigné, et liste les joueurs concernés.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const SAISON = '2026-2027';
const AUJOURD_HUI = new Date().toISOString().slice(0, 10);
console.log(`Date du jour considérée : ${AUJOURD_HUI}\n`);

const { data: cal, error: errCal } = await supabase
  .from('calendrier_officiel')
  .select('id, division, groupe, date_match, equipe_domicile, equipe_exterieur')
  .eq('saison', SAISON).gt('date_match', AUJOURD_HUI).order('date_match');
if (errCal) { console.error('Erreur calendrier :', errCal.message); process.exit(1); }
console.log(`${cal.length} ligne(s) calendrier_officiel avec une date future (> ${AUJOURD_HUI}), toutes divisions confondues.\n`);

const ids = cal.map((r) => r.id);
let mj = [];
for (let i = 0; i < ids.length; i += 500) {
  const lot = ids.slice(i, i + 500);
  if (!lot.length) continue;
  const { data, error } = await supabase.from('matchs_joueur').select('id, joueur_id, calendrier_officiel_id, minutes_jouees, buts, titulaire').in('calendrier_officiel_id', lot);
  if (error) { console.error('Erreur matchs_joueur :', error.message); process.exit(1); }
  mj = mj.concat(data || []);
}
const avecMinutes = mj.filter((m) => m.minutes_jouees != null);
console.log(`${avecMinutes.length} ligne(s) matchs_joueur avec minutes_jouees renseigné pour un match à une date FUTURE (impossible normalement).\n`);

const parCal = new Map();
for (const m of avecMinutes) {
  if (!parCal.has(m.calendrier_officiel_id)) parCal.set(m.calendrier_officiel_id, []);
  parCal.get(m.calendrier_officiel_id).push(m);
}
if (parCal.size) {
  console.log('=== Détail par match ===');
  for (const [calId, lignes] of parCal) {
    const c = cal.find((r) => r.id === calId);
    console.log(`  id=${calId} division=${c.division} groupe=${c.groupe} date=${c.date_match} "${c.equipe_domicile}" vs "${c.equipe_exterieur}" — ${lignes.length} joueur(s) avec minutes_jouees renseigné`);
  }
  const joueurIds = [...new Set(avecMinutes.map((m) => m.joueur_id))];
  const { data: joueurs } = await supabase.from('joueurs').select('id, prenom, nom, club, matchs_joues').in('id', joueurIds);
  console.log('\n=== Joueurs concernés (avec leur matchs_joues actuel en base) ===');
  for (const j of joueurs || []) console.log(`  ${j.prenom} ${j.nom} (${j.club}) — matchs_joues=${j.matchs_joues}`);
}
