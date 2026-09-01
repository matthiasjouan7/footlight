// Diagnostic lecture seule : Union Foot de Touraine (et variantes) a joues=0.0 pour tous ses joueurs
// malgré des lignes calendrier normalement peuplées (mj~16-20). Objectif : comprendre pourquoi
// aucune stat n'a jamais été synchronisée pour ce club, avant toute correction.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const SAISON = '2026-2027';
const CLUBS = ['Union Foot de Touraine', 'UNION FOOT TOURAINE'];

for (const CLUB of CLUBS) {
  const { data: joueurs, error: errJ } = await supabase.from('joueurs').select('id, prenom, nom, club, matchs_joues').eq('club', CLUB).eq('niveau', 'N1').eq('saison', SAISON);
  if (errJ) { console.error('Erreur joueurs :', errJ.message); process.exit(1); }
  console.log(`\n=== ${CLUB} (${joueurs.length} joueur(s)) ===`);
  if (!joueurs.length) continue;

  for (const j of joueurs.slice(0, 5)) {
    const { data: mj, error: errMj } = await supabase.from('matchs_joueur').select('id, date_match, adversaire, score_pour, score_contre, minutes_jouees, calendrier_officiel_id').eq('joueur_id', j.id).eq('saison', SAISON).order('date_match').limit(5);
    if (errMj) { console.log(`  Erreur pour ${j.prenom} ${j.nom} : ${errMj.message}`); continue; }
    console.log(`  ${j.prenom} ${j.nom} : matchs_joues=${j.matchs_joues}, ${mj.length} ligne(s) matchs_joueur (échantillon) :`);
    mj.forEach((m) => console.log(`    date=${m.date_match} adversaire="${m.adversaire}" score=${m.score_pour}-${m.score_contre} minutes=${m.minutes_jouees} calendrier_officiel_id=${m.calendrier_officiel_id}`));
  }
}

console.log('\n--- Lignes calendrier_officiel N1 contenant "touraine" ---');
const { data: calN1, error: errCal } = await supabase.from('calendrier_officiel').select('id, groupe, journee, date_match, equipe_domicile, equipe_exterieur').eq('saison', SAISON).eq('division', 'N1');
if (errCal) { console.error('Erreur calendrier :', errCal.message); process.exit(1); }
const matches = calN1.filter((r) => /touraine/i.test(r.equipe_domicile || '') || /touraine/i.test(r.equipe_exterieur || ''));
console.log(`${matches.length} ligne(s) trouvée(s).`);
for (const m of matches.slice(0, 15)) {
  console.log(`  id=${m.id} groupe=${m.groupe} j${m.journee} date=${m.date_match} "${m.equipe_domicile}" vs "${m.equipe_exterieur}"`);
}
