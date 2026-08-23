// Diagnostic lecture seule : suite de diagnostic-fff-api-suite2.js.
// Même un fetch() natif exécuté DANS le contexte JS de la page déjà
// chargée échoue en 403 — élimine cookies/session/TLS/webdriver comme
// cause, puisque c'est littéralement le même navigateur/page qui vient de
// réussir l'appel initial. Reste : un en-tête que le HttpClient Angular
// (XMLHttpRequest, pas fetch) ajoute automatiquement et qu'on ne
// reproduit pas, ou un jeton à courte durée de vie lié au chargement.
// Capture donc TOUS les en-têtes de la requête qui réussit réellement.
import { chromium } from 'playwright';

const URL = 'https://epreuves.fff.fr/competition/engagement/2-n1/phase/1/3/resultats-et-calendrier';

const browser = await chromium.launch(process.env.PW_EXECUTABLE_PATH ? { executablePath: process.env.PW_EXECUTABLE_PATH } : {});
const page = await browser.newPage();

let requeteReussie = null;
page.on('request', (req) => {
  if (req.url().includes('/api/data/matches')) {
    console.log(`\nRequête interceptée : ${req.method()} ${req.url()}`);
    console.log(`Type de ressource : ${req.resourceType()}`);
    console.log('En-têtes envoyés :');
    console.log(JSON.stringify(req.headers(), null, 2));
  }
});
page.on('response', async (res) => {
  if (res.url().includes('/api/data/matches')) {
    console.log(`\nRéponse : ${res.status()} pour ${res.url()}`);
    if (res.status() === 200 && !requeteReussie) {
      requeteReussie = { url: res.url(), headers: res.request().headers() };
    }
  }
});

await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1500);

console.log('\n=== Résumé requête réussie (200) ===');
console.log(requeteReussie ? JSON.stringify(requeteReussie, null, 2) : 'Aucune requête 200 interceptée.');

console.log('\n=== navigator.webdriver dans la page ===');
const webdriver = await page.evaluate(() => navigator.webdriver);
console.log(`navigator.webdriver = ${webdriver}`);

console.log('\n=== Cookies du contexte au moment du chargement ===');
const cookies = await page.context().cookies();
console.log(JSON.stringify(cookies.map((c) => ({ name: c.name, domain: c.domain, httpOnly: c.httpOnly })), null, 2));

await browser.close();
