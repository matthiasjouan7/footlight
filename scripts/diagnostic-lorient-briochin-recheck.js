// Diagnostic lecture seule : le signalement précédent (Lorient B, Saint-
// Brieuc, Bayonne, Les Herbiers) a été corrigé et confirmé via les logs de
// workflow, mais l'utilisateur signale toujours aucune stat/calendrier
// visible côté joueur. Vérifie l'état actuel en base pour un échantillon
// de joueurs de chaque club concerné : matchs_joueur existants, et
// re-teste le rapprochement club exact (comme le ferait le site).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const CLUBS = ['FC LORIENT 2', 'Stade Briochin', 'Saint-Brieuc', 'Aviron Bayonnais FC', 'Bayonne', 'LES HERBIERS VF', 'Les Herbiers'];

const { data: joueurs, error } = await supabase
  .from('joueurs')
  .select('id, prenom, nom, club, niveau, saison, matchs_joues')
  .in('club', CLUBS)
  .eq('saison', '2026-2027');
if (error) { console.error('Erreur joueurs :', error.message); process.exit(1); }
console.log(`${joueurs.length} joueur(s) trouvé(s) pour ces clubs (saison 2026-2027).\n`);

const parClub = new Map();
for (const j of joueurs) {
  if (!parClub.has(j.club)) parClub.set(j.club, []);
  parClub.get(j.club).push(j);
}

for (const [club, liste] of parClub) {
  console.log(`=== ${club} : ${liste.length} joueur(s) ===`);
  const echantillon = liste.slice(0, 3);
  for (const j of echantillon) {
    const { data: matchs, error: errM, count } = await supabase
      .from('matchs_joueur')
      .select('id, date_match, adversaire, calendrier_officiel_id', { count: 'exact' })
      .eq('joueur_id', j.id);
    if (errM) { console.error(`  Erreur matchs_joueur pour ${j.prenom} ${j.nom} :`, errM.message); continue; }
    console.log(`  ${j.prenom} ${j.nom} (id=${j.id}, matchs_joues=${j.matchs_joues}) : ${count} ligne(s) matchs_joueur`);
    for (const m of (matchs || []).slice(0, 3)) console.log(`     ${m.date_match} vs ${m.adversaire} (calendrier_officiel_id=${m.calendrier_officiel_id})`);
  }
  console.log('');
}
