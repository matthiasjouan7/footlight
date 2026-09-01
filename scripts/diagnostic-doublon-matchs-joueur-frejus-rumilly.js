// Diagnostic lecture seule : l'utilisateur signale que des joueurs de
// Fréjus (ÉFC Fréjus Saint-Raphaël) et Rumilly (GFA Rumilly Vallières) ont
// 3 matchs_joues alors que seules les journées 1 et 2 de N1 groupe C ont
// été jouées à ce jour (journée 3 = 2026-09-05, dans le futur). Vérifie si
// certains joueurs ont deux lignes matchs_joueur pour la même date réelle
// (une pointant vers une ancienne ligne calendrier "legacy" non fusionnée,
// une vers la ligne canonique), ce qui doublerait le compte de matchs
// joués pour un même match réel.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const SAISON = '2026-2027';
const CLUBS = ['ÉFC Fréjus Saint-Raphaël', 'GFA Rumilly Vallières'];

for (const club of CLUBS) {
  const { data: joueurs, error: errJ } = await supabase.from('joueurs').select('id, prenom, nom, matchs_joues').eq('club', club).eq('niveau', 'N1').eq('saison', SAISON);
  if (errJ) { console.error('Erreur joueurs :', errJ.message); process.exit(1); }
  console.log(`\n=== ${club} (${joueurs.length} joueur(s)) ===`);

  const joueursAvecMatchs = joueurs.filter((j) => (j.matchs_joues || 0) >= 2).slice(0, 5);
  for (const j of joueursAvecMatchs) {
    const { data: mj, error: errMj } = await supabase.from('matchs_joueur').select('id, date_match, adversaire, score_pour, score_contre, minutes_jouees, calendrier_officiel_id').eq('joueur_id', j.id).eq('saison', SAISON).not('minutes_jouees', 'is', null).order('date_match');
    if (errMj) { console.log(`  Erreur pour ${j.prenom} ${j.nom} : ${errMj.message}`); continue; }
    console.log(`  ${j.prenom} ${j.nom} : matchs_joues=${j.matchs_joues}, ${mj.length} ligne(s) matchs_joueur avec minutes_jouees renseignées :`);
    mj.forEach((m) => console.log(`    date=${m.date_match} adversaire="${m.adversaire}" score=${m.score_pour}-${m.score_contre} minutes=${m.minutes_jouees} calendrier_officiel_id=${m.calendrier_officiel_id}`));
    const dates = mj.map((m) => m.date_match);
    const datesUniques = new Set(dates);
    if (datesUniques.size < dates.length) console.log(`    ⚠️  DOUBLON DÉTECTÉ : ${dates.length} lignes mais seulement ${datesUniques.size} date(s) distincte(s) !`);
  }
}
