// Diagnostic lecture seule : le précédent diagnostic (jointure via
// calendrier_officiel.date_match) a trouvé 0 cas de match futur déjà
// "joué" — mais l'utilisateur montre une capture d'écran concrète (profil
// joueur) où un match dans 10 jours affiche déjà "90 min" et "vérifié FFF",
// et confirme qu'il y en a plusieurs comme ça en National 2.
//
// Hypothèse corrigée : matchs_joueur a SA PROPRE colonne date_match
// (dénormalisée, copiée depuis la source au moment de l'écriture), affichée
// telle quelle sur le profil joueur — indépendante de
// calendrier_officiel.date_match. Si cette colonne dénormalisée est future
// alors que minutes_jouees est renseigné, c'est le vrai bug, invisible dans
// le diagnostic précédent qui ne regardait que la date côté calendrier.
//
// Cible spécifiquement National 2 (comme signalé), mais remonte aussi les
// autres divisions pour voir l'ampleur réelle.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const SAISON = '2026-2027';
const AUJOURD_HUI = new Date().toISOString().slice(0, 10);
console.log(`Date du jour considérée : ${AUJOURD_HUI}\n`);

const { data: mj, error: errMj } = await supabase
  .from('matchs_joueur')
  .select('id, joueur_id, calendrier_officiel_id, date_match, adversaire, minutes_jouees, buts, titulaire, score_pour, score_contre')
  .eq('saison', SAISON)
  .gt('date_match', AUJOURD_HUI)
  .not('minutes_jouees', 'is', null);
if (errMj) { console.error('Erreur matchs_joueur :', errMj.message); process.exit(1); }
console.log(`${mj.length} ligne(s) matchs_joueur avec date_match FUTURE (> ${AUJOURD_HUI}) ET minutes_jouees renseigné (toutes divisions).\n`);

if (!mj.length) { console.log('Aucun cas trouvé avec ce critère.'); process.exit(0); }

const joueurIds = [...new Set(mj.map((m) => m.joueur_id))];
const { data: joueurs } = await supabase.from('joueurs').select('id, prenom, nom, club, niveau, groupe').in('id', joueurIds);
const joueurParId = new Map((joueurs || []).map((j) => [j.id, j]));

const n2 = mj.filter((m) => (joueurParId.get(m.joueur_id) || {}).niveau === 'N2');
console.log(`Dont ${n2.length} en National 2.\n`);

console.log('=== Détail (National 2 en premier) ===');
const tries = [...n2, ...mj.filter((m) => !n2.includes(m))];
for (const m of tries.slice(0, 60)) {
  const j = joueurParId.get(m.joueur_id) || {};
  console.log(`  ${j.prenom} ${j.nom} (${j.club}, niveau=${j.niveau}) — date_match=${m.date_match} adversaire="${m.adversaire}" minutes=${m.minutes_jouees} buts=${m.buts} score=${m.score_pour}-${m.score_contre} calendrier_officiel_id=${m.calendrier_officiel_id}`);
}

// Pour un échantillon, compare à la vraie date côté calendrier_officiel.
const calIds = [...new Set(mj.map((m) => m.calendrier_officiel_id).filter(Boolean))];
if (calIds.length) {
  const { data: cal } = await supabase.from('calendrier_officiel').select('id, date_match, equipe_domicile, equipe_exterieur').in('id', calIds);
  const calParId = new Map((cal || []).map((c) => [c.id, c]));
  console.log('\n=== Comparaison date_match (matchs_joueur) vs date_match (calendrier_officiel) ===');
  for (const m of tries.slice(0, 30)) {
    if (!m.calendrier_officiel_id) continue;
    const c = calParId.get(m.calendrier_officiel_id);
    if (!c) continue;
    const ecart = c.date_match !== m.date_match;
    console.log(`  matchs_joueur.date_match=${m.date_match} vs calendrier_officiel.date_match=${c.date_match}${ecart ? '  <-- DIFFÉRENT' : '  (identique)'} — "${c.equipe_domicile}" vs "${c.equipe_exterieur}"`);
  }
}
