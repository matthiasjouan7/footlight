// Diagnostic lecture seule : l'utilisateur signale que les joueurs de
// Nîmes ont 2 matchs enregistrés alors qu'un seul a été joué. Vérifie
// les lignes matchs_joueur pour un échantillon de joueurs Nîmes (déjà
// repéré plus tôt : "Nîmes Olympique", N1) datées <= aujourd'hui, pour
// détecter un doublon (deux calendrier_officiel_id différents pour la
// même date/adversaire réel).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const AUJOURDHUI = '2026-08-25';

const { data: joueurs, error } = await supabase
  .from('joueurs')
  .select('id, prenom, nom, club, niveau, saison')
  .ilike('club', '%nimes%')
  .eq('saison', '2026-2027');
if (error) { console.error('Erreur joueurs :', error.message); process.exit(1); }
console.log(`${joueurs.length} joueur(s) trouvé(s) avec club contenant "nimes".`);

for (const j of joueurs.slice(0, 5)) {
  const { data: matchs, error: errM } = await supabase
    .from('matchs_joueur')
    .select('id, date_match, adversaire, score_pour, score_contre, calendrier_officiel_id, domicile')
    .eq('joueur_id', j.id)
    .lte('date_match', AUJOURDHUI)
    .order('date_match', { ascending: true });
  if (errM) { console.error(`Erreur pour ${j.prenom} ${j.nom} :`, errM.message); continue; }
  console.log(`\n${j.prenom} ${j.nom} — club="${j.club}" : ${matchs.length} match(s) déjà passé(s)`);
  for (const m of matchs) console.log(`  id=${m.id} | ${m.date_match} vs ${m.adversaire} (${m.domicile ? 'dom.' : 'ext.'}) | score=${m.score_pour}-${m.score_contre} | cal_id=${m.calendrier_officiel_id}`);
}

// Lignes calendrier_officiel Nîmes pour repérer un éventuel doublon de nom
const { data: cal, error: errC } = await supabase
  .from('calendrier_officiel')
  .select('id, equipe_domicile, equipe_exterieur, division, groupe, date_match')
  .eq('saison', '2026-2027')
  .or('equipe_domicile.ilike.%nimes%,equipe_exterieur.ilike.%nimes%')
  .lte('date_match', AUJOURDHUI)
  .order('date_match', { ascending: true });
if (errC) console.error('Erreur calendrier :', errC.message);
else {
  console.log(`\nLignes calendrier_officiel Nîmes déjà passées : ${cal.length}`);
  for (const r of cal) console.log(`  id=${r.id} | ${r.division} groupe=${r.groupe} | ${r.date_match} | ${r.equipe_domicile} vs ${r.equipe_exterieur}`);
}
