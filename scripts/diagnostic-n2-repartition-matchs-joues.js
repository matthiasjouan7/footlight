// Diagnostic lecture seule : l'utilisateur signale qu'il y a "trop peu de
// joueurs à 2 matchs" en National 2, après le nettoyage des 59 lignes
// polluées par le bug "composition Probable Transfermarkt traitée comme
// Officielle" (voir nettoie-transfermarkt-matchs-futurs-n2.js).
//
// Hypothèse : sync-transfermarkt-match-stats-n2.js (avec ses bugs corrigés
// cette session — misattribution de composition PR #920, détection du type
// d'événement PR #923, garde-fou de date PR #928/#929) n'a été relancé en
// écriture réelle QUE sur le groupe C (rattrapages buts/cartons compris).
// Les 7 autres groupes (A, B, D, E, F, G, H) ont peut-être encore des
// lignes matchs_joueur avec minutes_jouees=null pour des matchs déjà joués
// (journées 1 et 2), soit parce que le script n'a jamais tourné dessus avec
// les bugs corrigés, soit parce que la composition a été mal attribuée
// (joueur non retrouvé, ligne jamais mise à jour).
//
// joueurs n'a pas de colonne "groupe" (confirmé par une exécution
// précédente : "column joueurs.groupe does not exist") — le groupe d'un
// joueur est déduit en rapprochant son club à celui des lignes
// calendrier_officiel de National 2 (même logique de rapprochement mot-à-
// mot que les scripts de synchro).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const SAISON = '2026-2027';
const AUJOURD_HUI = new Date().toISOString().slice(0, 10);
console.log(`Date du jour considérée : ${AUJOURD_HUI}\n`);

function normaliser(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
const MOTS_GENERIQUES = new Set(['fc', 'ofc', 'afc', 'asc', 'ac', 'sc', 'csc', 'cs', 'us', 'uso', 'as', 'sm', 'sa', 'vf', 'football', 'club', 'sporting', 'racing', 'stade', 'olympique', 'ol', 'd', '1', '2', 'sur', 'sous', 'en', 'la', 'le', 'les', 'de', 'du', 'des']);
function motsClub(s) {
  const mots = normaliser(s).split(' ').filter(Boolean).filter((w) => !MOTS_GENERIQUES.has(w));
  return mots.length ? mots : normaliser(s).split(' ').filter(Boolean);
}
function clubsCorrespondent(a, b) {
  const wa = motsClub(a), wb = motsClub(b);
  if (!wa.length || !wb.length) return false;
  const [small, big] = wa.length <= wb.length ? [wa, wb] : [wb, wa];
  return small.every((w) => big.some((w2) => w === w2 || (Math.min(w.length, w2.length) >= 4 && (w.startsWith(w2) || w2.startsWith(w)))));
}

const { data: calendrierComplet, error: errCalTout } = await supabase
  .from('calendrier_officiel').select('id, groupe, journee, date_match, equipe_domicile, equipe_exterieur')
  .eq('division', 'N2').eq('saison', SAISON);
if (errCalTout) { console.error('Erreur calendrier_officiel :', errCalTout.message); process.exit(1); }

// Pagination explicite : sans .range(), Supabase plafonne silencieusement
// une réponse à 1000 lignes — déjà rencontré plusieurs fois cette session
// (diagnostic-n2-matchs-futurs-deja-joues.js notamment). Il y a largement
// plus de 1000 joueurs N2 toutes divisions confondues.
let joueursN2 = [];
{
  const PAGE = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('joueurs').select('id, prenom, nom, club')
      .eq('niveau', 'N2').eq('saison', SAISON)
      .range(from, from + PAGE - 1);
    if (error) { console.error('Erreur joueurs :', error.message); process.exit(1); }
    joueursN2 = joueursN2.concat(data || []);
    if (!data || data.length < PAGE) break;
    from += PAGE;
  }
}
console.log(`${joueursN2.length} joueur(s) FootLight niveau N2 (saison ${SAISON}).\n`);

const clubsParGroupe = new Map();
for (const c of calendrierComplet) {
  if (!clubsParGroupe.has(c.groupe)) clubsParGroupe.set(c.groupe, new Set());
  clubsParGroupe.get(c.groupe).add(c.equipe_domicile);
  clubsParGroupe.get(c.groupe).add(c.equipe_exterieur);
}

const sansGroupe = [];
const parGroupe = new Map();
for (const j of joueursN2) {
  let groupeTrouve = null;
  for (const [groupe, clubs] of clubsParGroupe) {
    if ([...clubs].some((c) => clubsCorrespondent(c, j.club))) { groupeTrouve = groupe; break; }
  }
  if (!groupeTrouve) { sansGroupe.push(j); continue; }
  if (!parGroupe.has(groupeTrouve)) parGroupe.set(groupeTrouve, []);
  parGroupe.get(groupeTrouve).push(j);
}
if (sansGroupe.length) console.log(`${sansGroupe.length} joueur(s) N2 dont le club n'a été rapproché d'AUCUN groupe : ${sansGroupe.slice(0, 10).map((j) => `${j.prenom} ${j.nom} (${j.club})`).join(', ')}${sansGroupe.length > 10 ? '…' : ''}\n`);

// Un lot de 200 joueur_id peut à lui seul dépasser 1000 lignes
// matchs_joueur (jusqu'à ~30 lignes/joueur sur la saison) : pagine aussi
// CHAQUE lot, sans quoi la troncature silencieuse à 1000 lignes fait
// disparaître à tort la plupart des vraies stats du décompte (bug constaté
// : Herman Lemaître, dont les 2 buts sont bien en base, ressortait à 0
// match avant ce correctif).
const joueurIdsToutes = joueursN2.map((j) => j.id);
let mjTous = [];
const TAILLE_LOT = 100;
for (let i = 0; i < joueurIdsToutes.length; i += TAILLE_LOT) {
  const lot = joueurIdsToutes.slice(i, i + TAILLE_LOT);
  const PAGE = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('matchs_joueur').select('joueur_id, minutes_jouees')
      .eq('saison', SAISON).in('joueur_id', lot)
      .range(from, from + PAGE - 1);
    if (error) { console.error('Erreur matchs_joueur :', error.message); break; }
    mjTous = mjTous.concat(data || []);
    if (!data || data.length < PAGE) break;
    from += PAGE;
  }
}
const nbMatchsParJoueur = new Map();
for (const m of mjTous) {
  if (m.minutes_jouees == null) continue;
  nbMatchsParJoueur.set(m.joueur_id, (nbMatchsParJoueur.get(m.joueur_id) || 0) + 1);
}

for (const groupe of [...parGroupe.keys()].sort()) {
  const joueurs = parGroupe.get(groupe);
  const calGroupe = calendrierComplet.filter((c) => c.groupe === groupe);
  const journeesJouees = [...new Set(calGroupe.filter((c) => c.date_match <= AUJOURD_HUI).map((c) => c.journee))].filter((j) => j != null).sort((a, b) => a - b);

  const repartition = {};
  const sansAucun = [];
  for (const j of joueurs) {
    const n = nbMatchsParJoueur.get(j.id) || 0;
    repartition[n] = (repartition[n] || 0) + 1;
    if (n === 0) sansAucun.push(j);
  }
  console.log(`Groupe ${groupe} : ${journeesJouees.length} journée(s) jouée(s) (${journeesJouees.join(',')}), ${joueurs.length} joueur(s) FootLight.`);
  console.log(`  Répartition nb de matchs avec minutes renseignées : ${Object.entries(repartition).sort((a, b) => a[0] - b[0]).map(([n, c]) => `${n}→${c}`).join('  ')}`);
  if (sansAucun.length) console.log(`  ${sansAucun.length} joueur(s) à 0 match : ${sansAucun.slice(0, 8).map((j) => `${j.prenom} ${j.nom} (${j.club})`).join(', ')}${sansAucun.length > 8 ? '…' : ''}`);
  console.log('');
}
