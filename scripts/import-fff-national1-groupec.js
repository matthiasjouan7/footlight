// Réconcilie calendrier_officiel pour National 1 / groupe C / saison
// 2026-2027 avec les données officielles FFF (epreuves.fff.fr), suite au
// repêchage d'Union Foot de Touraine (poule passée à 17 équipes).
//
// Les données actuelles en base sont obsolètes : encore calées sur l'ancienne
// poule à 16 équipes (30 journées, pas de Touraine), avec des doublons de
// noms de club sous deux graphies différentes (ex: "ISTRES FC" / "Istres",
// "NIMES OL" / "Nîmes") et une journée 1 comptant 20 lignes au lieu de ~8.
// Confirmé par check-touraine-calendrier.js. Remplacement complet choisi
// par l'utilisateur — mais un premier essai de suppression en bloc a
// échoué : "matchs_joueur_calendrier_officiel_id_fkey" bloque la
// suppression de toute ligne calendrier_officiel déjà référencée par une
// ligne matchs_joueur (stats déjà synchronisées pour les matchs déjà
// joués, ex: journée 1 du 21-22/08). Un remplacement en bloc détruirait
// donc soit ces stats soit échouerait complètement.
//
// Stratégie de réconciliation à la place d'un delete-then-insert :
// 1. Rapproche chaque match FFF à une ligne existante (mêmes équipes via
//    clubsCorrespondent, même date) — si trouvée, MET À JOUR cette ligne
//    (id conservé, donc les matchs_joueur liées restent valides) plutôt
//    que de la recréer.
// 2. Les matchs FFF sans ligne correspondante sont INSÉRÉS (nouveaux
//    matchs, notamment tous ceux impliquant Union Foot Touraine).
// 3. Les lignes existantes non rapprochées à un match FFF sont
//    supprimées SEULEMENT si aucune ligne matchs_joueur ne les référence
//    (doublons/anciennes lignes de l'ère 16 équipes, sans conséquence).
// 4. Les lignes existantes non rapprochées MAIS référencées par
//    matchs_joueur ne sont jamais touchées automatiquement — juste
//    signalées, pour décision manuelle (ne devrait pas arriver en
//    pratique, mais on ne supprime jamais une stat déjà saisie sans
//    confirmation explicite).
//
// Découvertes des diagnostics précédents (API JSON epreuves.fff.fr) :
// - cpNo=452036, phNo=1, gpNo=3 identifient National 1 / phase 1 / groupe C.
// - L'API exige un en-tête "x-competition" (jeton capturé depuis une vraie
//   requête Angular) ET un fetch() exécuté dans le moteur réseau de
//   Chromium (page.evaluate) — sinon 403, même avec le bon en-tête depuis
//   Node ou page.request.get(). Voir diagnostic-fff-api-suite2.js /
//   diagnostic-fff-api-headers.js / diagnostic-fff-api-combo.js.
// - Une plage de dates couvrant toute la saison renvoie 503 (page de
//   maintenance FFF) — il faut paginer par tranches de 14 jours.
// - Champs match utiles : donneesFormatees.date, .recevant.club.nom,
//   .visiteur.club.nom, .recevant.buts, .visiteur.buts, .joue. Le numéro de
//   journée n'est pas sur le match lui-même : dérivé de la liste des
//   journées (date + pjNo) intégrée dans les métadonnées de compétition
//   partagées, en cherchant le groupe "POULE C" (gpNo=3).
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

// Rapprochement de noms de club — même logique que sync-foot-direct-passes.js
// (mots génériques ignorés, tolérance de préfixe 4 caractères minimum).
function normaliserClub(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
const MOTS_GENERIQUES_CLUB = new Set(['fc', 'ofc', 'afc', 'asc', 'ac', 'sc', 'csc', 'cs', 'us', 'uso', 'as', 'sm', 'sa', 'vf', 'football', 'club', 'sporting', 'racing', 'stade', 'olympique', 'sur', 'sous', 'en', 'la', 'le', 'les', 'de', 'du', 'des']);
function motsClub(s) {
  const mots = normaliserClub(s).split(' ').filter(Boolean).filter((w) => !MOTS_GENERIQUES_CLUB.has(w));
  return mots.length ? mots : normaliserClub(s).split(' ').filter(Boolean);
}
function motsCorrespondent(a, b) {
  if (a === b) return true;
  const [court, long] = a.length <= b.length ? [a, b] : [b, a];
  return court.length >= 4 && long.startsWith(court);
}
function clubsCorrespondent(a, b) {
  const wa = motsClub(a), wb = motsClub(b);
  if (!wa.length || !wb.length) return false;
  const [small, big] = wa.length <= wb.length ? [wa, wb] : [wb, wa];
  for (const w of small) if (!big.some((w2) => motsCorrespondent(w, w2))) return false;
  return true;
}

const DRY_RUN = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const DIVISION = 'N1';
const GROUPE = 'C';
const SAISON = '2026-2027';

const URL_PAGE = 'https://epreuves.fff.fr/competition/engagement/2-n1/phase/1/3/resultats-et-calendrier';
const BASE_API = 'https://epreuves.fff.fr/api/data/matches?cpNo=452036&phNo=1&gpNo=3';
const DEBUT_SAISON = new Date('2026-07-01T00:00:00Z');
const FIN_SAISON = new Date('2027-06-30T00:00:00Z');
const JOURS_PAR_TRANCHE = 14;

console.log(`Mode : ${DRY_RUN ? 'DRY_RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}\n`);

const browser = await chromium.launch(process.env.PW_EXECUTABLE_PATH ? { executablePath: process.env.PW_EXECUTABLE_PATH } : {});
const page = await browser.newPage();

let jeton = null;
page.on('request', (req) => {
  if (req.url().includes('/api/data/matches') && !jeton) {
    jeton = req.headers()['x-competition'] || null;
  }
});
await page.goto(URL_PAGE, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1000);
if (!jeton) { console.error('Jeton x-competition introuvable, abandon.'); await browser.close(); process.exit(1); }
console.log(`Jeton x-competition capturé : ${jeton}`);

async function appelerApi(dateDebut, dateFin) {
  const url = `${BASE_API}&dateDebut=${encodeURIComponent(dateDebut.toISOString())}&dateFin=${encodeURIComponent(dateFin.toISOString())}&itemsPerPage=200&page=1&pagination=true`;
  return page.evaluate(async ({ u, xc }) => {
    try {
      const r = await fetch(u, { headers: { Accept: 'application/json, text/plain, */*', 'x-competition': xc } });
      const texte = await r.text();
      if (r.status !== 200) return { statut: r.status, erreur: texte.slice(0, 200) };
      return { statut: 200, membres: JSON.parse(texte)['hydra:member'] || [] };
    } catch (err) {
      return { statut: 0, erreur: String(err) };
    }
  }, { u: url, xc: jeton });
}

const matchsParId = new Map();
let journeesGroupeC = null;
let curseur = new Date(DEBUT_SAISON);
let tranchesEchouees = 0;

while (curseur < FIN_SAISON) {
  const fin = new Date(Math.min(curseur.getTime() + JOURS_PAR_TRANCHE * 86400000, FIN_SAISON.getTime()));
  const resultat = await appelerApi(curseur, fin);
  if (resultat.statut === 200) {
    for (const m of resultat.membres) {
      if (m.id) matchsParId.set(m.id, m);
      if (!journeesGroupeC) {
        const groupes = m?.donneesFormatees?.competition?.donneesFormatees?.phases?.[0]?.groupes || [];
        const groupeC = groupes.find((g) => g.gpNo === '3' || /poule\s*c/i.test(g.nom || ''));
        if (groupeC?.journees?.length) {
          journeesGroupeC = groupeC.journees
            .map((j) => ({ pjNo: parseInt(j.pjNo, 10), date: j.date }))
            .sort((a, b) => a.date.localeCompare(b.date));
        }
      }
    }
  } else {
    tranchesEchouees++;
    console.log(`Tranche ${curseur.toISOString().slice(0, 10)} -> ${fin.toISOString().slice(0, 10)} : ÉCHEC statut=${resultat.statut}`);
  }
  curseur = fin;
  await page.waitForTimeout(300);
}
await browser.close();

console.log(`\nMatchs FFF récupérés : ${matchsParId.size} (tranches en échec : ${tranchesEchouees})`);
if (!journeesGroupeC) { console.error('Liste des journées groupe C introuvable, abandon.'); process.exit(1); }
console.log(`Journées groupe C connues : ${journeesGroupeC.length} (de J${journeesGroupeC[0].pjNo} à J${journeesGroupeC.at(-1).pjNo})`);

function journeePour(dateMatchIso) {
  let trouve = journeesGroupeC[0].pjNo;
  for (const j of journeesGroupeC) {
    if (j.date <= dateMatchIso) trouve = j.pjNo;
    else break;
  }
  return trouve;
}

const lignes = [];
for (const m of matchsParId.values()) {
  const df = m.donneesFormatees;
  const domicile = df?.recevant?.club?.nom;
  const exterieur = df?.visiteur?.club?.nom;
  const dateIso = df?.date;
  if (!domicile || !exterieur || !dateIso) continue;
  lignes.push({
    equipe_domicile: domicile,
    equipe_exterieur: exterieur,
    date_match: dateIso.slice(0, 10),
    division: DIVISION,
    groupe: GROUPE,
    saison: SAISON,
    journee: journeePour(dateIso),
  });
}
console.log(`Lignes prêtes à insérer : ${lignes.length}`);

const equipes = new Set();
for (const l of lignes) { equipes.add(l.equipe_domicile); equipes.add(l.equipe_exterieur); }
console.log(`Équipes distinctes (${equipes.size}) :`);
console.log([...equipes].sort().join(', '));
console.log(`\nTouraine présent : ${[...equipes].some((e) => /touraine/i.test(e))}`);

const parJournee = {};
for (const l of lignes) parJournee[l.journee] = (parJournee[l.journee] || 0) + 1;
console.log(`\nMatchs par journée : ${JSON.stringify(parJournee)}`);

const { data: existantes, error: erreurLecture } = await supabase
  .from('calendrier_officiel')
  .select('id, equipe_domicile, equipe_exterieur, date_match, journee')
  .eq('division', DIVISION)
  .eq('groupe', GROUPE)
  .eq('saison', SAISON);
if (erreurLecture) { console.error('Erreur lecture existant :', erreurLecture.message); process.exit(1); }
console.log(`\nLignes existantes (division=${DIVISION}, groupe=${GROUPE}, saison=${SAISON}) : ${existantes?.length || 0}`);

// Repère les lignes existantes protégées par une contrainte de clé
// étrangère (des stats matchs_joueur ont déjà été synchronisées dessus) —
// jamais supprimées automatiquement, même si non rapprochées à un match FFF.
const idsExistants = (existantes || []).map((e) => e.id);
const idsReferences = new Set();
for (let i = 0; i < idsExistants.length; i += 100) {
  const lot = idsExistants.slice(i, i + 100);
  if (!lot.length) continue;
  const { data: refs, error: erreurRefs } = await supabase
    .from('matchs_joueur')
    .select('calendrier_officiel_id')
    .in('calendrier_officiel_id', lot);
  if (erreurRefs) { console.error('Erreur lecture matchs_joueur :', erreurRefs.message); process.exit(1); }
  for (const r of refs || []) idsReferences.add(r.calendrier_officiel_id);
}
console.log(`Lignes existantes référencées par matchs_joueur (protégées) : ${idsReferences.size}`);

// Rapprochement : chaque ligne existante non encore utilisée est associée
// au premier match FFF correspondant (mêmes équipes, même date_match).
const existantesRestantes = new Set(existantes || []);
const aMettreAJour = [];
const aInserer = [];
for (const l of lignes) {
  const correspondance = [...existantesRestantes].find(
    (e) => e.date_match === l.date_match && clubsCorrespondent(e.equipe_domicile, l.equipe_domicile) && clubsCorrespondent(e.equipe_exterieur, l.equipe_exterieur)
  );
  if (correspondance) {
    existantesRestantes.delete(correspondance);
    const inchange = correspondance.equipe_domicile === l.equipe_domicile
      && correspondance.equipe_exterieur === l.equipe_exterieur
      && correspondance.journee === l.journee;
    if (!inchange) aMettreAJour.push({ id: correspondance.id, ...l });
  } else {
    aInserer.push(l);
  }
}
const nonRapprochees = [...existantesRestantes];
const aSupprimer = nonRapprochees.filter((e) => !idsReferences.has(e.id));
const nonSupprimables = nonRapprochees.filter((e) => idsReferences.has(e.id));

console.log(`\nPlan de réconciliation :`);
console.log(`  À mettre à jour (nom/journée corrigés, id conservé) : ${aMettreAJour.length}`);
console.log(`  À insérer (nouveaux matchs, dont Touraine) : ${aInserer.length}`);
console.log(`  À supprimer (obsolètes, non référencées) : ${aSupprimer.length}`);
console.log(`  Non rapprochées MAIS protégées (jamais supprimées automatiquement) : ${nonSupprimables.length}`);
if (nonSupprimables.length) {
  console.log('  Détail des lignes protégées non rapprochées (à examiner manuellement) :');
  for (const e of nonSupprimables) console.log(`    id=${e.id} — ${e.date_match} — J${e.journee} — ${e.equipe_domicile} vs ${e.equipe_exterieur}`);
}

console.log('\n5 premiers exemples à insérer :');
for (const l of aInserer.slice(0, 5)) console.log(`  ${l.date_match} — J${l.journee} — ${l.equipe_domicile} vs ${l.equipe_exterieur}`);
console.log('\n5 premiers exemples à mettre à jour :');
for (const l of aMettreAJour.slice(0, 5)) console.log(`  id=${l.id} -> ${l.date_match} — J${l.journee} — ${l.equipe_domicile} vs ${l.equipe_exterieur}`);

if (DRY_RUN) {
  console.log('\nDRY_RUN : aucune suppression, mise à jour ni insertion effectuée.');
  process.exit(0);
}

console.log('\n=== Écriture réelle ===');

let supprimes = 0;
for (const e of aSupprimer) {
  const { error } = await supabase.from('calendrier_officiel').delete().eq('id', e.id);
  if (error) { console.error(`Erreur suppression id=${e.id} :`, error.message); process.exit(1); }
  supprimes++;
}
console.log(`Supprimé : ${supprimes} ligne(s) obsolète(s).`);

let misesAJour = 0;
for (const l of aMettreAJour) {
  const { id, ...champs } = l;
  const { error } = await supabase.from('calendrier_officiel').update(champs).eq('id', id);
  if (error) { console.error(`Erreur mise à jour id=${id} :`, error.message); process.exit(1); }
  misesAJour++;
}
console.log(`Mis à jour : ${misesAJour} ligne(s).`);

const TAILLE_LOT = 100;
let inseres = 0;
for (let i = 0; i < aInserer.length; i += TAILLE_LOT) {
  const lot = aInserer.slice(i, i + TAILLE_LOT);
  const { error } = await supabase.from('calendrier_officiel').insert(lot);
  if (error) { console.error(`Erreur insertion lot ${i} :`, error.message); process.exit(1); }
  inseres += lot.length;
}
console.log(`Inséré : ${inseres} ligne(s).`);

if (nonSupprimables.length) {
  console.log(`\nATTENTION : ${nonSupprimables.length} ligne(s) protégée(s) par matchs_joueur n'ont pas pu être rapprochées d'un match FFF et n'ont pas été touchées — à examiner manuellement (voir détail ci-dessus).`);
}
