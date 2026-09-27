// Diagnostic lecture seule : sync-transfermarkt-match-stats-n2.js (groupe G)
// ne rapproche jamais les matchs impliquant "Et.S. Fosseenne 1" (aucun des
// 3 apparaît dans les 12/22 matchs rapprochés lors du run du 27/09). Le
// correctif de synonyme apporté côté lequipe.fr (CLUB_SYNONYMES_COMPLETS)
// ne s'applique pas ici : ce script a son propre moteur de rapprochement
// séparé (clubsCorrespondent/motsClub), sans notion de synonyme complet.
// Liste les titres bruts des pages de match Transfermarkt (journées 1-3,
// groupe G) pour voir sous quel nom le club apparaît côté Transfermarkt.
import { chromium } from 'playwright';

const SAISON_ID_TM = '2026';
const WETTBEWERB = 'FR5G';

const browser = await chromium.launch();
const page = await browser.newPage({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' });

const urls = [];
for (let journee = 1; journee <= 3; journee++) {
  const urlJournee = `https://www.transfermarkt.fr/national-2/spieltag/wettbewerb/${WETTBEWERB}/saison_id/${SAISON_ID_TM}/spieltag/${journee}`;
  await page.goto(urlJournee, { waitUntil: 'networkidle', timeout: 45000 });
  const hrefs = await page.evaluate(() => [...new Set([...document.querySelectorAll('a[href*="/spielbericht/index/spielbericht/"]')].map((a) => a.getAttribute('href')))]);
  for (const href of hrefs) urls.push({ journee, url: `https://www.transfermarkt.fr${href}` });
}
console.log(`${urls.length} lien(s) de match trouvé(s) au total (3 journées).\n`);

const vus = new Set();
for (const { journee, url } of urls) {
  if (vus.has(url)) continue;
  vus.add(url);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
  const titre = await page.title();
  console.log(`J${journee} : "${titre}"`);
}

await browser.close();
