// Diagnostic lecture seule : l'utilisateur signale qu'en National 1, les
// joueurs de Troyes sont bloqués à 1 match joué (contrairement aux
// autres clubs) parce que le match contre Rumilly n'est pas comptabilisé.
// Vérifie, pour les joueurs de Troyes, l'état réel de leurs
// matchs_joueur (date, calendrier_officiel_id, minutes_jouees), et
// repère la ligne calendrier_officiel N1 du match Troyes/Rumilly pour
// voir si elle existe et si les stats y sont rattachées.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const SAISON = '2026-2027';

const { data: joueurs, error: errJ } = await supabase
  .from('joueurs')
  .select('id, prenom, nom, club, matchs_joues')
  .ilike('club', '%troyes%')
  .eq('niveau', 'N1')
  .eq('saison', SAISON);
if (errJ) { console.error('Erreur joueurs :', errJ.message); process.exit(1); }

console.log(`=== Joueurs "Troyes" N1 (${joueurs.length}) ===\n`);
const clubsVus = new Set(joueurs.map((j) => j.club));
console.log('Clubs exacts trouvés :', [...clubsVus].join(' | '), '\n');

const parJoues = new Map();
for (const j of joueurs) {
  const k = j.matchs_joues ?? 0;
  parJoues.set(k, (parJoues.get(k) || 0) + 1);
}
console.log('Répartition matchs_joues :');
for (const [k, n] of [...parJoues.entries()].sort((a, b) => a[0] - b[0])) console.log(`  ${k} match(s) joué(s) : ${n} joueur(s)`);

console.log('\nDétail (tous les joueurs, toutes leurs lignes matchs_joueur) :');
for (const j of joueurs) {
  const { data: mj, error: errMj } = await supabase
    .from('matchs_joueur')
    .select('id, date_match, adversaire, score_pour, score_contre, minutes_jouees, calendrier_officiel_id')
    .eq('joueur_id', j.id).eq('saison', SAISON).order('date_match');
  if (errMj) { console.log(`  Erreur pour ${j.prenom} ${j.nom} : ${errMj.message}`); continue; }
  console.log(`  ${j.prenom} ${j.nom} (club="${j.club}") : matchs_joues=${j.matchs_joues}, ${mj.length} ligne(s) matchs_joueur :`);
  mj.forEach((m) => console.log(`    date=${m.date_match} adversaire="${m.adversaire}" score=${m.score_pour}-${m.score_contre} minutes=${m.minutes_jouees} calendrier_officiel_id=${m.calendrier_officiel_id}`));
}

// Lignes calendrier N1 pour repérer le(s) match(s) Troyes/Rumilly
const { data: cal, error: errCal } = await supabase
  .from('calendrier_officiel')
  .select('id, groupe, date_match, equipe_domicile, equipe_exterieur')
  .eq('saison', SAISON).eq('division', 'N1');
if (errCal) { console.error('Erreur calendrier :', errCal.message); process.exit(1); }
console.log('\nLignes calendrier_officiel N1 contenant "troyes" ou "rumilly" :');
for (const r of cal) {
  const dom = (r.equipe_domicile || '').toLowerCase();
  const ext = (r.equipe_exterieur || '').toLowerCase();
  if (/troyes|rumilly/i.test(dom) || /troyes|rumilly/i.test(ext)) {
    console.log(`  id=${r.id} groupe=${r.groupe} date=${r.date_match} "${r.equipe_domicile}" vs "${r.equipe_exterieur}"`);
  }
}

// Pour la/les ligne(s) Troyes/Rumilly trouvée(s), regarde s'il existe déjà des lignes matchs_joueur (pour d'autres joueurs) rattachées
const lignesTroyesRumilly = cal.filter((r) => {
  const dom = (r.equipe_domicile || '').toLowerCase();
  const ext = (r.equipe_exterieur || '').toLowerCase();
  return (/troyes/i.test(dom) && /rumilly/i.test(ext)) || (/rumilly/i.test(dom) && /troyes/i.test(ext));
});
for (const ligne of lignesTroyesRumilly) {
  const { data: mjLigne, error: errMjLigne } = await supabase
    .from('matchs_joueur')
    .select('id, joueur_id, minutes_jouees')
    .eq('calendrier_officiel_id', ligne.id);
  if (errMjLigne) { console.log(`Erreur matchs_joueur pour calendrier_officiel_id=${ligne.id} : ${errMjLigne.message}`); continue; }
  console.log(`\ncalendrier_officiel_id=${ligne.id} ("${ligne.equipe_domicile}" vs "${ligne.equipe_exterieur}", ${ligne.date_match}) : ${mjLigne.length} ligne(s) matchs_joueur au total (tous clubs confondus), ${mjLigne.filter((m) => m.minutes_jouees != null).length} avec minutes_jouees renseignées.`);
}
