// Diagnostic lecture seule : l'utilisateur signale que la plupart des
// joueurs de Lyon La Duchère sont bloqués à 1 match joué (au lieu de 2,
// deux journées ayant été jouées) parce que le premier match (contre
// Rumilly, journée 1) n'est pas comptabilisé, sauf pour un joueur qui est
// bien à 2. Signale aussi qu'il manque le match contre Fréjus pour AS
// Saint-Priest. Vérifie, pour un échantillon de joueurs de chaque club,
// l'état réel de leurs matchs_joueur (date, calendrier_officiel_id,
// minutes_jouees) pour repérer si la ligne calendrier de journée 1 leur
// est bien rattachée, et si oui pourquoi les stats n'y sont pas.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const SAISON = '2026-2027';
const CLUBS = ['Lyon - La Duchère', 'AS Saint-Priest'];

for (const CLUB of CLUBS) {
  const { data: joueurs, error: errJ } = await supabase.from('joueurs').select('id, prenom, nom, matchs_joues').eq('club', CLUB).eq('niveau', 'N1').eq('saison', SAISON);
  if (errJ) { console.error('Erreur joueurs :', errJ.message); process.exit(1); }
  console.log(`=== ${CLUB} (${joueurs.length} joueur(s)) ===\n`);

  const parJoues = new Map();
  for (const j of joueurs) {
    const k = j.matchs_joues ?? 0;
    parJoues.set(k, (parJoues.get(k) || 0) + 1);
  }
  console.log('Répartition matchs_joues :');
  for (const [k, n] of [...parJoues.entries()].sort((a, b) => a[0] - b[0])) console.log(`  ${k} match(s) joué(s) : ${n} joueur(s)`);

  console.log('\nDétail (10 premiers joueurs, toutes leurs lignes matchs_joueur) :');
  for (const j of joueurs.slice(0, 10)) {
    const { data: mj, error: errMj } = await supabase.from('matchs_joueur').select('id, date_match, adversaire, score_pour, score_contre, minutes_jouees, calendrier_officiel_id').eq('joueur_id', j.id).eq('saison', SAISON).order('date_match');
    if (errMj) { console.log(`  Erreur pour ${j.prenom} ${j.nom} : ${errMj.message}`); continue; }
    console.log(`  ${j.prenom} ${j.nom} : matchs_joues=${j.matchs_joues}, ${mj.length} ligne(s) matchs_joueur :`);
    mj.forEach((m) => console.log(`    date=${m.date_match} adversaire="${m.adversaire}" score=${m.score_pour}-${m.score_contre} minutes=${m.minutes_jouees} calendrier_officiel_id=${m.calendrier_officiel_id}`));
  }
  console.log('');
}

// Lignes calendrier N1 groupe C pour repérer les matchs Rumilly/Duchère et Fréjus/Saint-Priest
const { data: calC, error: errCalC } = await supabase.from('calendrier_officiel').select('id, groupe, date_match, equipe_domicile, equipe_exterieur').eq('saison', SAISON).eq('division', 'N1');
if (errCalC) { console.error('Erreur calendrier :', errCalC.message); process.exit(1); }
console.log('Lignes calendrier_officiel N1 contenant "duch", "rumilly", "priest" ou "frejus"/"fréjus" :');
for (const r of calC) {
  const dom = (r.equipe_domicile || '').toLowerCase();
  const ext = (r.equipe_exterieur || '').toLowerCase();
  if (/duch|rumilly|priest|frejus|fr.jus/i.test(dom) || /duch|rumilly|priest|frejus|fr.jus/i.test(ext)) {
    console.log(`  id=${r.id} groupe=${r.groupe} date=${r.date_match} "${r.equipe_domicile}" vs "${r.equipe_exterieur}"`);
  }
}
