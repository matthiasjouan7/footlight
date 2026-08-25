// Diagnostic lecture seule : après la synchro manuelle (groupe A N1
// contenant 207 joueurs mis à jour), l'utilisateur signale toujours
// aucune stat pour les joueurs de Lorient (FC Lorient B / FC LORIENT 2).
// Vérifie l'état réel : matchs_joueur avec score, et si le club de ces
// joueurs correspond bien au nom utilisé par le script de sync
// lui-même (peut avoir sa propre logique de rapprochement différente
// de generer-calendriers-existants.js).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const { data: joueurs, error } = await supabase
  .from('joueurs')
  .select('id, prenom, nom, club, niveau, saison')
  .or('club.ilike.%lorient%')
  .eq('saison', '2026-2027');
if (error) { console.error('Erreur joueurs :', error.message); process.exit(1); }
console.log(`${joueurs.length} joueur(s) trouvé(s) avec club contenant "lorient".`);

for (const j of joueurs.slice(0, 8)) {
  const { data: matchs, error: errM } = await supabase
    .from('matchs_joueur')
    .select('date_match, adversaire, score_pour, score_contre, verifie, calendrier_officiel_id')
    .eq('joueur_id', j.id)
    .order('date_match', { ascending: true })
    .limit(3);
  if (errM) { console.error(`Erreur pour ${j.prenom} ${j.nom} :`, errM.message); continue; }
  console.log(`\n${j.prenom} ${j.nom} — club="${j.club}"`);
  for (const m of matchs || []) console.log(`  ${m.date_match} vs ${m.adversaire} | score_pour=${m.score_pour} score_contre=${m.score_contre} verifie=${m.verifie} cal_id=${m.calendrier_officiel_id}`);
}

const { data: calLorient, error: errC } = await supabase
  .from('calendrier_officiel')
  .select('id, equipe_domicile, equipe_exterieur, division, saison, date_match')
  .eq('saison', '2026-2027')
  .or('equipe_domicile.ilike.%lorient%,equipe_exterieur.ilike.%lorient%')
  .order('date_match', { ascending: true })
  .limit(5);
if (errC) console.error('Erreur calendrier :', errC.message);
else {
  console.log('\nLignes calendrier_officiel contenant "lorient" :');
  for (const r of calLorient) console.log(`  id=${r.id} | ${r.division} | ${r.date_match} | ${r.equipe_domicile} vs ${r.equipe_exterieur}`);
}
