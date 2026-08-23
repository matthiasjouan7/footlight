// Diagnostic lecture seule : ni Node fetch() nu + en-tête x-competition
// (diagnostic-fff-api-xcompetition.js, 403) ni Chromium fetch() sans
// l'en-tête (diagnostic-fff-api-suite2.js, 403) ne suffisent seuls.
// Teste la combinaison : rejouer l'en-tête x-competition capturé, mais
// depuis un fetch() exécuté DANS le Chromium réel (page.evaluate), pour
// isoler si le blocage vient d'une empreinte TLS/réseau Node vs en-tête
// manquant, ou d'un jeton x-competition à courte durée de vie (lié à la
// session/à l'instant du chargement), auquel cas même la combinaison
// échouera.
import { chromium } from 'playwright';

const URL = 'https://epreuves.fff.fr/competition/engagement/2-n1/phase/1/3/resultats-et-calendrier';
const BASE = 'https://epreuves.fff.fr/api/data/matches?cpNo=452036&phNo=1&gpNo=3';

const browser = await chromium.launch(process.env.PW_EXECUTABLE_PATH ? { executablePath: process.env.PW_EXECUTABLE_PATH } : {});
const page = await browser.newPage();

let jetonCapture = null;
page.on('request', (req) => {
  if (req.url().includes('/api/data/matches') && !jetonCapture) {
    jetonCapture = req.headers()['x-competition'] || null;
  }
});

await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1000);

console.log(`Jeton x-competition capturé sur CETTE page : ${jetonCapture}`);

async function testerDepuisPage(label, url, xCompetition) {
  console.log(`\n=== ${label} ===`);
  const resultat = await page.evaluate(async ({ u, xc }) => {
    try {
      const headers = { Accept: 'application/json, text/plain, */*' };
      if (xc) headers['x-competition'] = xc;
      const r = await fetch(u, { headers });
      const texte = await r.text();
      return { statut: r.status, taille: texte.length, apercu: texte.slice(0, 800) };
    } catch (err) {
      return { erreur: String(err) };
    }
  }, { u: url, xc: xCompetition });
  console.log(JSON.stringify(resultat, null, 2).slice(0, 1500));
  return resultat;
}

// Rejoue le jeton capturé SUR CETTE MÊME PAGE, plage large, depuis Chromium.
await testerDepuisPage(
  'Chromium fetch() + x-competition (frais, cette page), plage large',
  `${BASE}&dateDebut=2026-07-01T00:00:00%2B00:00&dateFin=2027-06-30T00:00:00%2B00:00&itemsPerPage=200&page=1&pagination=true`,
  jetonCapture
);

// Le jeton capturé lors d'un run PRÉCÉDENT (diagnostic-fff-api-headers.js),
// pour voir s'il est stable dans le temps ou généré à chaque chargement.
await testerDepuisPage(
  'Chromium fetch() + x-competition (ancien, run précédent), plage étroite',
  `${BASE}&dateDebut=2026-08-22T00:00:00%2B00:00&dateFin=2026-08-29T00:00:00%2B00:00&itemsPerPage=200&page=1&pagination=true`,
  '80cb2ae0bcee96250927df322696e781fbebf1e3'
);

await browser.close();
