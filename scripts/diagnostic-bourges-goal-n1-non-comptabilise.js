// Diagnostic lecture seule : l'utilisateur signale qu'en National 1, Bourges
// est bloqué à 2 matchs joués car le match contre GOAL FC n'est pas
// comptabilisé (même symptôme que Troyes/Rumilly, corrigé précédemment via
// diagnostic-troyes-n1-rumilly-non-comptabilise.js). Vérifie l'état réel
// des matchs_joueur des joueurs Bourges, et repère la/les ligne(s)
// calendrier_officiel N1 Bourges/GOAL FC pour voir s'il y a un doublon de
// calendrier ou un autre blocage.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const SAISON = '2026-2027';

const { data: joueurs, error: errJ } = await supabase
  .from('joueurs')
  .select('id, prenom, nom, club, matchs_joues')
  .ilike('club', '%bourges%')
  .eq('niveau', 'N1')
  .eq('saison', SAISON);
if (errJ) { console.error('Erreur joueurs :', errJ.message); process.exit(1); }

console.log(`=== Joueurs "Bourges" N1 (${joueurs.length}) ===\n`);
console.log('Clubs exacts trouvés :', [...new Set(joueurs.map((j) => j.club))].join(' | '), '\n');

const parJoues = new Map();
for (const j of joueurs) {
  const k = j.matchs_joues ?? 0;
  parJoues.set(k, (parJoues.get(k) || 0) + 1);
}
console.log('Répartition matchs_joues :');
for (const [k, n] of [...parJoues.entries()].sort((a, b) => a[0] - b[0])) console.log(`  ${k} match(s) joué(s) : ${n} joueur(s)`);

console.log('\nDétail (5 premiers joueurs, toutes leurs lignes matchs_joueur) :');
for (const j of joueurs.slice(0, 5)) {
  const { data: mj, error: errMj } = await supabase
    .from('matchs_joueur')
    .select('id, date_match, adversaire, score_pour, score_contre, minutes_jouees, calendrier_officiel_id')
    .eq('joueur_id', j.id).eq('saison', SAISON).order('date_match');
  if (errMj) { console.log(`  Erreur pour ${j.prenom} ${j.nom} : ${errMj.message}`); continue; }
  console.log(`  ${j.prenom} ${j.nom} (club="${j.club}") : matchs_joues=${j.matchs_joues}, ${mj.length} ligne(s) matchs_joueur :`);
  mj.forEach((m) => console.log(`    date=${m.date_match} adversaire="${m.adversaire}" score=${m.score_pour}-${m.score_contre} minutes=${m.minutes_jouees} calendrier_officiel_id=${m.calendrier_officiel_id}`));
}

// Lignes calendrier N1 pour repérer le(s) match(s) Bourges/GOAL
const { data: cal, error: errCal } = await supabase
  .from('calendrier_officiel')
  .select('id, groupe, date_match, equipe_domicile, equipe_exterieur')
  .eq('saison', SAISON).eq('division', 'N1');
if (errCal) { console.error('Erreur calendrier :', errCal.message); process.exit(1); }
console.log('\nLignes calendrier_officiel N1 contenant "bourges" ou "goal" :');
for (const r of cal) {
  const dom = (r.equipe_domicile || '').toLowerCase();
  const ext = (r.equipe_exterieur || '').toLowerCase();
  if (/bourges|goal|grand ouest/i.test(dom) || /bourges|goal|grand ouest/i.test(ext)) {
    console.log(`  id=${r.id} groupe=${r.groupe} date=${r.date_match} "${r.equipe_domicile}" vs "${r.equipe_exterieur}"`);
  }
}

const lignesBourgesGoal = cal.filter((r) => {
  const dom = (r.equipe_domicile || '').toLowerCase();
  const ext = (r.equipe_exterieur || '').toLowerCase();
  return (/bourges/i.test(dom) && /goal|grand ouest/i.test(ext)) || (/goal|grand ouest/i.test(dom) && /bourges/i.test(ext));
});
for (const ligne of lignesBourgesGoal) {
  const { data: mjLigne, error: errMjLigne } = await supabase
    .from('matchs_joueur')
    .select('id, joueur_id, minutes_jouees')
    .eq('calendrier_officiel_id', ligne.id);
  if (errMjLigne) { console.log(`Erreur matchs_joueur pour calendrier_officiel_id=${ligne.id} : ${errMjLigne.message}`); continue; }
  console.log(`\ncalendrier_officiel_id=${ligne.id} ("${ligne.equipe_domicile}" vs "${ligne.equipe_exterieur}", ${ligne.date_match}) : ${mjLigne.length} ligne(s) matchs_joueur au total, ${mjLigne.filter((m) => m.minutes_jouees != null).length} avec minutes_jouees renseignées.`);
}
