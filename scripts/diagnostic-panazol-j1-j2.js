// Diagnostic lecture seule : l'utilisateur signale, pour le club AS Panazol
// (National 2 groupe B), des incohérences entre les journées 1 et 2 —
// certains joueurs auraient le temps de jeu mais pas le résultat (score),
// et l'inverse sur l'autre journée. sync-transfermarkt-match-stats-n2.js
// signale "Compositions introuvables ou vides, match ignoré" pour les 2
// matchs de Panazol (id=675 journée 1 vs Fontenay Vendée, id=689 journée 2
// vs La Chataigneraie) — Transfermarkt ne fournit donc aucune donnée pour
// ce club, qui doit être synchronisé par un AUTRE pipeline (le badge
// "vérifié FFF" vu sur le profil d'Artur Toroyan plus tôt cette session).
//
// Dump complet, pour chaque joueur FootLight d'AS Panazol, de ses lignes
// matchs_joueur des journées 1 et 2 (minutes, score, buts, verifie), pour
// voir précisément le motif d'incohérence rapporté.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const SAISON = '2026-2027';

const { data: joueurs, error: errJ } = await supabase
  .from('joueurs').select('id, prenom, nom, club, niveau')
  .ilike('club', '%panazol%').eq('saison', SAISON);
if (errJ) { console.error('Erreur joueurs :', errJ.message); process.exit(1); }
console.log(`${joueurs.length} joueur(s) FootLight "Panazol" (saison ${SAISON}) :\n`);

const idsCal = [675, 689];
const { data: cal } = await supabase.from('calendrier_officiel').select('*').in('id', idsCal);
console.log('=== Lignes calendrier_officiel ===');
for (const c of cal || []) console.log(JSON.stringify(c));
console.log('');

const joueurIds = joueurs.map((j) => j.id);
const { data: mj, error: errMj } = await supabase
  .from('matchs_joueur').select('*')
  .in('joueur_id', joueurIds).eq('saison', SAISON)
  .in('calendrier_officiel_id', idsCal);
if (errMj) { console.error('Erreur matchs_joueur :', errMj.message); process.exit(1); }

const parJoueur = new Map();
for (const m of mj) {
  if (!parJoueur.has(m.joueur_id)) parJoueur.set(m.joueur_id, []);
  parJoueur.get(m.joueur_id).push(m);
}
for (const j of joueurs) {
  const lignes = (parJoueur.get(j.id) || []).sort((a, b) => (a.date_match || '').localeCompare(b.date_match || ''));
  console.log(`${j.prenom} ${j.nom} (${j.club}) :`);
  if (!lignes.length) { console.log('  (aucune ligne matchs_joueur pour J1/J2)'); continue; }
  for (const m of lignes) {
    console.log(`  ${m.date_match} vs ${m.adversaire} (cal_id=${m.calendrier_officiel_id}) — minutes=${m.minutes_jouees} titulaire=${m.titulaire} buts=${m.buts} score=${m.score_pour}-${m.score_contre} verifie=${m.verifie} competition=${m.competition}`);
  }
}
