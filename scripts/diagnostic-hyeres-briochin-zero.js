// Diagnostic lecture seule : Hyères et Stade Briochin signalés toujours à
// 0 match/stat malgré la réparation du double comptage et le correctif de
// synchro (multi-date journée + suffixe équipe réserve). Vérifie l'état
// réel : joueurs.matchs_joues, lignes matchs_joueur (score connu ou non),
// et la ligne calendrier_officiel correspondante.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const AUJOURDHUI = '2026-08-25';

function sansAccents(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

async function inspecter(motCle) {
  console.log(`\n=== "${motCle}" ===`);
  const { data: candidats, error } = await supabase
    .from('joueurs')
    .select('id, prenom, nom, club, saison, matchs_joues')
    .eq('saison', '2026-2027')
    .not('club', 'is', null);
  if (error) { console.error('Erreur joueurs :', error.message); return; }
  const joueurs = candidats.filter((j) => sansAccents(j.club).includes(motCle));
  console.log(`${joueurs.length} joueur(s) trouvé(s).`);
  const clubs = [...new Set(joueurs.map((j) => j.club))];
  console.log(`Clubs distincts : ${clubs.join(' | ')}`);

  for (const j of joueurs.slice(0, 3)) {
    const { data: matchs } = await supabase
      .from('matchs_joueur')
      .select('id, date_match, adversaire, score_pour, score_contre, minutes_jouees, calendrier_officiel_id')
      .eq('joueur_id', j.id)
      .lte('date_match', AUJOURDHUI)
      .order('date_match', { ascending: true });
    console.log(`\n${j.prenom} ${j.nom} (${j.club}) : joueurs.matchs_joues=${j.matchs_joues} | ${matchs?.length || 0} match(s) déjà passé(s)`);
    for (const m of matchs || []) console.log(`  id=${m.id} | ${m.date_match} vs ${m.adversaire} | score=${m.score_pour}-${m.score_contre} | minutes_jouees=${m.minutes_jouees} | cal_id=${m.calendrier_officiel_id}`);
  }

  const { data: cal, error: errC } = await supabase
    .from('calendrier_officiel')
    .select('id, equipe_domicile, equipe_exterieur, division, groupe, journee, date_match, saison')
    .eq('saison', '2026-2027')
    .lte('date_match', AUJOURDHUI)
    .or(clubs.map((c) => `equipe_domicile.ilike.%${c.replace(/[%,]/g, '')}%`).concat(clubs.map((c) => `equipe_exterieur.ilike.%${c.replace(/[%,]/g, '')}%`)).join(','))
    .order('date_match', { ascending: true });
  if (errC) console.error('Erreur calendrier :', errC.message);
  else {
    console.log(`\nLignes calendrier_officiel déjà passées correspondantes : ${cal.length}`);
    for (const r of cal) console.log(`  id=${r.id} | ${r.division} groupe=${r.groupe} journee=${r.journee} | ${r.date_match} | ${r.equipe_domicile} vs ${r.equipe_exterieur}`);
  }
}

await inspecter('hyeres');
await inspecter('briochin');
