// Découverte (lecture seule) : la page "torschuetzenliste" (buteurs) de
// transfermarkt.fr contient-elle une colonne passes décisives (Ass.) en
// plus des buts ? Dump les en-têtes de colonnes et les premières lignes.
import { chromium } from 'playwright';

const url = process.env.TARGET_URL || 'https://www.transfermarkt.fr/championnat-national/torschuetzenliste/wettbewerb/FR3/saison_id/2026';

const browser = await chromium.launch();
const page = await browser.newPage({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  locale: 'fr-FR',
});
await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
console.log(`URL : ${url}`);
console.log(`Titre : "${await page.title()}"`);

const entetes = await page.evaluate(() => {
  const table = document.querySelector('table.items');
  if (!table) return null;
  return [...table.querySelectorAll('thead th')].map((th) => th.textContent.trim());
});
console.log(`\nEn-têtes de colonnes : ${JSON.stringify(entetes)}`);

const lignes = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('table.items > tbody > tr')].slice(0, 10);
  return rows.map((row) => [...row.querySelectorAll('td')].map((td) => td.textContent.trim()));
});
console.log(`\n${lignes.length} première(s) ligne(s) :`);
lignes.forEach((l) => console.log(JSON.stringify(l)));

await browser.close();
