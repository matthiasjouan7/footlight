// Diagnostic lecture seule : l'utilisateur montre une capture d'écran du
// profil d'un joueur (Artur Toroyan ?) dont l'historique de matchs affiche
// un match du 19/09/2026 déjà "✓ vérifié FFF" avec 90 minutes jouées, alors
// qu'on est le 09/09/2026 (match futur, donc impossible). Le badge "vérifié
// FFF" indique une source différente de Transfermarkt (pipeline FFF pour
// une division régionale — clubs vendéens : Fontenay Vendée, La
// Chataigneraie AS, Challans FC — pas National 2).
//
// Recherche le joueur par nom approximatif, liste tout son historique
// matchs_joueur (source, dates, minutes, vérification), et pour le match
// du 19/09 (ou toute date future), retrouve la ligne calendrier_officiel
// correspondante pour comprendre comment une donnée "vérifiée" a pu être
// écrite pour un match qui n'a pas encore eu lieu.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const SAISON = '2026-2027';
const NOM_RECHERCHE = process.env.NOM_RECHERCHE || 'toroyan';

console.log(`=== Recherche joueur(s) correspondant à "${NOM_RECHERCHE}" ===\n`);
const { data: candidats, error: errC } = await supabase
  .from('joueurs')
  .select('id, prenom, nom, club, niveau, saison, matchs_joues')
  .ilike('nom', `%${NOM_RECHERCHE}%`);
if (errC) { console.error('Erreur recherche joueurs :', errC.message); process.exit(1); }
for (const j of candidats) console.log(`id=${j.id} ${j.prenom} ${j.nom} club="${j.club}" niveau=${j.niveau} saison=${j.saison} matchs_joues=${j.matchs_joues}`);

const cible = candidats.find((j) => j.saison === SAISON) || candidats[0];
if (!cible) { console.log('\nAucun joueur trouvé.'); process.exit(0); }
console.log(`\n=== Historique complet matchs_joueur pour ${cible.prenom} ${cible.nom} (id=${cible.id}) ===\n`);

const { data: mj, error: errMj } = await supabase
  .from('matchs_joueur')
  .select('*')
  .eq('joueur_id', cible.id).eq('saison', SAISON)
  .order('date_match');
if (errMj) { console.error('Erreur matchs_joueur :', errMj.message); process.exit(1); }
for (const m of mj) {
  console.log(JSON.stringify(m, null, 2));
}

const AUJOURD_HUI = new Date().toISOString().slice(0, 10);
const futurs = mj.filter((m) => m.date_match > AUJOURD_HUI);
console.log(`\n=== ${futurs.length} ligne(s) matchs_joueur à une date future (> ${AUJOURD_HUI}) ===`);
for (const m of futurs) {
  if (m.calendrier_officiel_id) {
    const { data: cal } = await supabase.from('calendrier_officiel').select('*').eq('id', m.calendrier_officiel_id).maybeSingle();
    console.log(`\nLigne calendrier_officiel correspondante (id=${m.calendrier_officiel_id}) :`);
    console.log(JSON.stringify(cal, null, 2));
  } else {
    console.log(`\nLigne matchs_joueur id=${m.id} n'a PAS de calendrier_officiel_id (source probablement manuelle/déclarative).`);
  }
}
