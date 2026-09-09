// Diagnostic lecture seule : Nathan Bourdin (Blois Football 41, National 2
// groupe H) — l'utilisateur signale que le score du 2e match (journée 2)
// est connu mais que le temps de jeu n'est pas comptabilisé. Ce joueur
// faisait déjà partie des 59 lignes futures nettoyées (journée 3, 19/09,
// vs Corte) — ce diagnostic porte sur son historique complet pour situer
// précisément où le rapprochement échoue sur la journée 2.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const SAISON = '2026-2027';

const { data: candidats, error: errC } = await supabase
  .from('joueurs').select('id, prenom, nom, club, niveau, saison, matchs_joues')
  .ilike('nom', '%bourdin%');
if (errC) { console.error('Erreur joueurs :', errC.message); process.exit(1); }
console.log(`${candidats.length} ligne(s) "bourdin" :`);
for (const j of candidats) console.log(`  id=${j.id} ${j.prenom} ${j.nom} club="${j.club}" niveau=${j.niveau} saison=${j.saison} matchs_joues=${j.matchs_joues}`);

const cible = candidats.find((j) => j.saison === SAISON && /blois/i.test(j.club)) || candidats[0];
if (!cible) { console.log('Aucun joueur trouvé.'); process.exit(0); }
console.log(`\n=== Historique matchs_joueur de ${cible.prenom} ${cible.nom} (id=${cible.id}) ===`);
const { data: mj, error: errMj } = await supabase
  .from('matchs_joueur').select('*')
  .eq('joueur_id', cible.id).eq('saison', SAISON).order('date_match');
if (errMj) { console.error('Erreur matchs_joueur :', errMj.message); process.exit(1); }
for (const m of mj) console.log(JSON.stringify(m));

// Pour le 2e match (journée 2), regarde le calendrier + TOUTES les lignes
// matchs_joueur liées, côté domicile et extérieur, pour voir si le score
// est connu et combien de joueurs ont leurs minutes renseignées.
const passes = mj.filter((m) => m.date_match <= new Date().toISOString().slice(0, 10));
console.log(`\n${passes.length} match(s) passé(s) pour ce joueur.`);
for (const m of passes) {
  if (!m.calendrier_officiel_id) continue;
  const { data: cal } = await supabase.from('calendrier_officiel').select('*').eq('id', m.calendrier_officiel_id).maybeSingle();
  console.log(`\n--- calendrier_officiel_id=${m.calendrier_officiel_id} ---`);
  console.log(JSON.stringify(cal));
  const { data: tousMj } = await supabase.from('matchs_joueur').select('joueur_id, minutes_jouees, score_pour, score_contre, titulaire').eq('calendrier_officiel_id', m.calendrier_officiel_id);
  const avecMinutes = (tousMj || []).filter((x) => x.minutes_jouees != null).length;
  console.log(`  ${tousMj ? tousMj.length : 0} ligne(s) matchs_joueur liée(s) à ce match, ${avecMinutes} avec minutes_jouees renseigné.`);
}
