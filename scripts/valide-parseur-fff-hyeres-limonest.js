// Diagnostic lecture seule (aucune écriture) : valide le parseur du texte
// visible d'une page match FFF (résumé minute par minute + composition)
// en le comparant au match Hyères F.C. / FC Limonest Dardilly Saint
// Didier (National 1 groupe C, journée 1) dont les stats exactes ont déjà
// été saisies à la main dans corrige-stats-hyeres-limonest-j1-fff.js
// (source : lecture manuelle de la même page). Si le parseur retrouve les
// mêmes minutes_jouees/titulaire/buts pour tous les joueurs FCLDSD que la
// référence, il peut être généralisé à une synchro automatique complète.
import { chromium } from 'playwright';

const URL_MATCH = 'https://epreuves.fff.fr/competition/match/56635087-hyeres-f-c-football-club-limonest-dardilly-saint-didier/match';

// Référence (corrige-stats-hyeres-limonest-j1-fff.js) : nom -> {titulaire, minutes, buts}.
const REFERENCE = {
  'Alexandre Roselli': { titulaire: true, minutes: 90, buts: 0 },
  'Théo Braillon': { titulaire: true, minutes: 83, buts: 0 },
  'Mouhamadou Singoura': { titulaire: true, minutes: 90, buts: 1 },
  'Florian Raspentino': { titulaire: true, minutes: 66, buts: 0 },
  'Bryan Pellier': { titulaire: true, minutes: 70, buts: 0 },
  'Jordan Radojevic': { titulaire: true, minutes: 90, buts: 1 },
  'Nathan Tanard': { titulaire: true, minutes: 90, buts: 0 },
  'Simon Cateland': { titulaire: true, minutes: 90, buts: 0 },
  'Mamadou Magassouba': { titulaire: true, minutes: 90, buts: 0 },
  'Marwane Benhmida': { titulaire: true, minutes: 83, buts: 0 },
  'Kayne Bonnevie': { titulaire: true, minutes: 90, buts: 0 },
  'Yahya Soumaré': { titulaire: false, minutes: 24, buts: 0 },
  'Davis Abanda': { titulaire: false, minutes: 20, buts: 0 },
  'Tristan Bichet': { titulaire: false, minutes: 7, buts: 0 },
};

function normaliser(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

// ---- Parseur (texte visible de la page match FFF) ----
function parserPageMatch(texteBrut, clubDomicile, clubExterieur) {
  const lignes = texteBrut.split('\n').map((l) => l.trim()).filter(Boolean);

  const idxResume = lignes.indexOf('RÉSUMÉ');
  const idxComposition = lignes.indexOf('COMPOSITION', idxResume === -1 ? 0 : idxResume);
  if (idxResume === -1 || idxComposition === -1) throw new Error('Sections RÉSUMÉ/COMPOSITION introuvables.');

  // --- Résumé (buts / cartons / changements, avec minute) ---
  const eventLignes = lignes.slice(idxResume + 1, idxComposition);
  const evenements = [];
  const reMinute = /^(\d+)(\+(\d+))?['’]$/;
  let i = 0;
  while (i < eventLignes.length) {
    const m = eventLignes[i].match(reMinute);
    if (!m) { i++; continue; }
    const minute = parseInt(m[1], 10) + (m[3] ? parseInt(m[3], 10) : 0);
    i++;
    const typeLigne = eventLignes[i] || '';
    if (typeLigne.startsWith('But pour ')) {
      i++;
      if (eventLignes[i] === 'inscrit par') i++;
      const nom = eventLignes[i]; i++;
      evenements.push({ minute, type: 'but', joueur: nom });
    } else if (typeLigne.startsWith('Avertissement pour ')) {
      i++;
      const nom = eventLignes[i]; i++;
      if (eventLignes[i] === 'est averti') i++;
      evenements.push({ minute, type: 'jaune', joueur: nom });
    } else if (typeLigne.startsWith('Exclusion pour ') || /carton rouge/i.test(typeLigne)) {
      i++;
      const nom = eventLignes[i]; i++;
      evenements.push({ minute, type: 'rouge', joueur: nom });
    } else if (typeLigne.startsWith('Changement pour ')) {
      i++;
      const entre = eventLignes[i]; i++;
      if (eventLignes[i] === 'remplace') i++;
      const sort = eventLignes[i]; i++;
      evenements.push({ minute, type: 'changement', entre, sort });
    } else {
      i++; // type d'événement inconnu, on avance prudemment
    }
  }

  // --- Composition (titulaires/remplaçants par équipe) ---
  const compoLignes = lignes.slice(idxComposition + 1);
  const composition = {}; // nom joueur (normalisé) -> { club, titulaire }
  let clubCourant = null;
  let sousListe = null; // 'titulaires' | 'remplacants'
  const reNumero = /^\d+$/;
  for (let j = 0; j < compoLignes.length; j++) {
    const l = compoLignes[j];
    if (l === 'LIEU DE LA RENCONTRE') break;
    if (l === clubDomicile || l === clubExterieur) { clubCourant = l; sousListe = null; continue; }
    if (l === 'TITULAIRES') { sousListe = 'titulaires'; continue; }
    if (l === 'REMPLAÇANTS') { sousListe = 'remplacants'; continue; }
    if (reNumero.test(l) && sousListe && clubCourant) {
      const nom = compoLignes[j + 1];
      if (nom) { composition[normaliser(nom)] = { club: clubCourant, titulaire: sousListe === 'titulaires', nomAffiche: nom }; j++; }
    }
  }

  // --- Calcule minutes_jouees / buts / cartons par joueur ---
  const resultats = new Map();
  for (const [nomNorm, c] of Object.entries(composition)) {
    resultats.set(nomNorm, { nomAffiche: c.nomAffiche, club: c.club, titulaire: c.titulaire, minutes: c.titulaire ? 90 : 0, buts: 0, cartonsJaunes: 0, cartonsRouges: 0, aJoue: c.titulaire });
  }
  for (const ev of evenements) {
    if (ev.type === 'but') {
      const r = resultats.get(normaliser(ev.joueur));
      if (r) r.buts++;
    } else if (ev.type === 'jaune') {
      const r = resultats.get(normaliser(ev.joueur));
      if (r) r.cartonsJaunes++;
    } else if (ev.type === 'rouge') {
      const r = resultats.get(normaliser(ev.joueur));
      if (r) r.cartonsRouges++;
    } else if (ev.type === 'changement') {
      const rIn = resultats.get(normaliser(ev.entre));
      const rOut = resultats.get(normaliser(ev.sort));
      if (rOut) { rOut.minutes = ev.minute; }
      if (rIn) { rIn.minutes = 90 - ev.minute; rIn.aJoue = true; }
    }
  }

  return { evenements, resultats };
}

const browser = await chromium.launch(process.env.PW_EXECUTABLE_PATH ? { executablePath: process.env.PW_EXECUTABLE_PATH } : {});
const page = await browser.newPage({ locale: 'fr-FR' });
await page.goto(URL_MATCH, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(2000);
const texte = await page.evaluate(() => document.body.innerText);
await browser.close();

const { evenements, resultats } = parserPageMatch(texte, 'HYERES F.C.', 'FCLDSD');

console.log(`${evenements.length} événement(s) résumé trouvé(s).`);
console.log(`${resultats.size} joueur(s) en composition trouvé(s).\n`);

console.log('--- Comparaison FCLDSD (Limonest) vs référence saisie à la main ---');
let ok = 0, ko = 0;
for (const [nomRef, ref] of Object.entries(REFERENCE)) {
  const r = resultats.get(normaliser(nomRef));
  if (!r) { console.log(`  ${nomRef} : ABSENT du parseur !`); ko++; continue; }
  const match = r.titulaire === ref.titulaire && r.minutes === ref.minutes && r.buts === ref.buts;
  console.log(`  ${nomRef} : parseur={titulaire=${r.titulaire}, minutes=${r.minutes}, buts=${r.buts}} vs référence={titulaire=${ref.titulaire}, minutes=${ref.minutes}, buts=${ref.buts}} => ${match ? 'OK' : 'DIVERGENT'}`);
  match ? ok++ : ko++;
}
console.log(`\nRésumé : ${ok} OK, ${ko} divergent(s) sur ${Object.keys(REFERENCE).length} joueur(s) référence.`);
