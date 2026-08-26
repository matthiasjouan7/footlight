// Diagnostic lecture seule : l'utilisateur signale Hyères, Limonest et
// Épinal toujours sans stats malgré les correctifs précédents. Vérifie
// l'état réel des matchs_joueur (score, minutes) pour un échantillon de
// joueurs de ces 3 clubs.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

function sansAccents(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

async function fetchTousJoueurs() {
  const tous = [];
  let from = 0;
  const page = 1000;
  for (;;) {
    const { data, error } = await supabase
      .from('joueurs')
      .select('id, prenom, nom, club, saison, matchs_joues')
      .eq('saison', '2026-2027')
      .not('club', 'is', null)
      .range(from, from + page - 1);
    if (error) { console.error('Erreur joueurs :', error.message); return tous; }
    tous.push(...(data || []));
    if (!data || data.length < page) break;
    from += page;
  }
  return tous;
}

const tousJoueurs = await fetchTousJoueurs();

for (const motCle of ['hyeres', 'limonest', 'epinal', 'colmar']) {
  console.log(`\n=== "${motCle}" ===`);
  const joueurs = tousJoueurs.filter((j) => sansAccents(j.club).includes(motCle));
  console.log(`${joueurs.length} joueur(s), clubs distincts : ${[...new Set(joueurs.map((j) => j.club))].join(' | ')}`);
  for (const j of joueurs.slice(0, 3)) {
    const { data: matchs } = await supabase
      .from('matchs_joueur')
      .select('id, date_match, adversaire, score_pour, score_contre, minutes_jouees, calendrier_officiel_id')
      .eq('joueur_id', j.id)
      .lte('date_match', '2026-08-26')
      .order('date_match', { ascending: true });
    console.log(`${j.prenom} ${j.nom} (${j.club}) : joueurs.matchs_joues=${j.matchs_joues}`);
    for (const m of matchs || []) console.log(`  id=${m.id} | ${m.date_match} vs ${m.adversaire} | score=${m.score_pour}-${m.score_contre} | minutes=${m.minutes_jouees} | cal_id=${m.calendrier_officiel_id}`);
  }
}
