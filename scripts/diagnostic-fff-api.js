// Diagnostic lecture seule : la page FFF (Angular SPA) affiche le
// calendrier semaine par semaine avec navigation précédente/suivante —
// cherche si elle appelle une API JSON en arrière-plan (plus robuste et
// rapide qu'un clic répété sur "suivante" pour récupérer toute la saison).
import { chromium } from 'playwright';

const URL = 'https://epreuves.fff.fr/competition/engagement/2-n1/phase/1/3/resultats-et-calendrier';

const browser = await chromium.launch(process.env.PW_EXECUTABLE_PATH ? { executablePath: process.env.PW_EXECUTABLE_PATH } : {});
const page = await browser.newPage();

const requetesJson = [];
page.on('response', async (res) => {
  const ct = res.headers()['content-type'] || '';
  if (ct.includes('application/json') && res.request().method() === 'GET') {
    requetesJson.push(res.url());
  }
});

await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1500);
console.log(`Requêtes JSON au chargement initial (${requetesJson.length}) :`);
for (const u of requetesJson) console.log(`  ${u}`);

// Clique "navigation suivante" pour voir l'appel réseau déclenché.
const avant = requetesJson.length;
const boutonSuivant = page.getByText('navigation suivante', { exact: false });
if (await boutonSuivant.count()) {
  await boutonSuivant.first().click();
  await page.waitForTimeout(1500);
  console.log(`\nNouvelles requêtes JSON après clic "suivante" (${requetesJson.length - avant}) :`);
  for (const u of requetesJson.slice(avant)) console.log(`  ${u}`);
} else {
  console.log('\nBouton "navigation suivante" non trouvé via getByText.');
}

await browser.close();
