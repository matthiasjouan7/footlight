// Diagnostic lecture seule : le fetch() nu sur l'API FFF
// (epreuves.fff.fr/api/data/matches) a renvoyé 403 avec une plage de dates
// large (toute la saison). Ce script isole la cause :
//   Hypothèse A : la largeur de la plage de dates déclenche le 403
//     -> testée via fetch() nu avec une plage étroite (1 semaine), comme
//        celle utilisée avec succès par le navigateur réel.
//   Hypothèse B : c'est l'absence de contexte navigateur (cookies/headers)
//     -> testée en appelant l'API depuis l'intérieur d'une page Playwright
//        (page.request.get, qui hérite des cookies/session) avec la
//        plage large de toute la saison.
import { chromium } from 'playwright';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json',
};

const BASE = 'https://epreuves.fff.fr/api/data/matches?cpNo=452036&phNo=1&gpNo=3';

console.log('=== Hypothèse A : fetch() nu, plage étroite (1 semaine) ===');
const urlEtroite = `${BASE}&dateDebut=2026-08-22T00:00:00%2B00:00&dateFin=2026-08-29T00:00:00%2B00:00&itemsPerPage=200&page=1&pagination=true`;
try {
  const res = await fetch(urlEtroite, { headers: HEADERS });
  const texte = await res.text();
  console.log(`Statut : ${res.status}, taille : ${texte.length} caractères`);
  console.log(texte.slice(0, 500));
} catch (err) {
  console.log(`Erreur : ${err.message}`);
}

console.log('\n=== Hypothèse B : appel depuis le contexte navigateur (page.request), plage large (saison complète) ===');
const browser = await chromium.launch(process.env.PW_EXECUTABLE_PATH ? { executablePath: process.env.PW_EXECUTABLE_PATH } : {});
const page = await browser.newPage();
await page.goto('https://epreuves.fff.fr/competition/engagement/2-n1/phase/1/3/resultats-et-calendrier', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1000);

const urlLarge = `${BASE}&dateDebut=2026-07-01T00:00:00%2B00:00&dateFin=2027-06-30T00:00:00%2B00:00&itemsPerPage=200&page=1&pagination=true`;
const resPage = await page.request.get(urlLarge, { headers: { Accept: 'application/json' } });
console.log(`Statut : ${resPage.status()}`);
const texteLarge = await resPage.text();
console.log(`Taille réponse : ${texteLarge.length} caractères`);

let data;
try {
  data = JSON.parse(texteLarge);
} catch {
  console.log('Pas du JSON valide, aperçu :');
  console.log(texteLarge.slice(0, 1000));
  await browser.close();
  process.exit(0);
}
console.log(`Clés racine : ${JSON.stringify(Object.keys(data))}`);
const liste = Array.isArray(data) ? data : (data.member || data.data || data['hydra:member'] || null);
if (liste) {
  console.log(`Nombre de matchs : ${liste.length}`);
  console.log('Premier match :');
  console.log(JSON.stringify(liste[0], null, 2));
  const dates = [...new Set(liste.map((m) => (m.date || m.dateMatch || m.dateRencontre || '').slice(0, 10)))].sort();
  console.log(`\nDates présentes : ${dates.join(', ')}`);
  console.log(`"Touraine" présent : ${texteLarge.toLowerCase().includes('touraine')}`);
} else {
  console.log('Structure inattendue :');
  console.log(JSON.stringify(data, null, 2).slice(0, 2000));
}

await browser.close();
