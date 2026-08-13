// Découverte (lecture seule) : charge une page epreuves.fff.fr (portail
// officiel FFF, SPA) avec un user-agent réaliste et capture TOUTES les
// requêtes réseau (XHR/fetch) déclenchées pendant le chargement, pour
// repérer l'API JSON interne que le SPA utilise — souvent plus fiable
// qu'un scraping de page rendue, et permet de contourner un éventuel blocage
// du rendu (ex: "APPLICATION MOMENTANÉMENT INDISPONIBLE" observé en headless).
import { chromium } from 'playwright';

const url = process.env.TARGET_URL;
if (!url) { console.error('TARGET_URL manquant.'); process.exit(1); }

const browser = await chromium.launch();
const page = await browser.newPage({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  extraHTTPHeaders: { 'Accept-Language': 'fr-FR,fr;q=0.9' },
  viewport: { width: 1366, height: 900 },
});

const appels = [];
page.on('response', async (res) => {
  const req = res.request();
  const type = req.resourceType();
  if (type !== 'xhr' && type !== 'fetch') return;
  const contentType = res.headers()['content-type'] || '';
  let corps = null;
  if (contentType.includes('json')) {
    try { corps = (await res.text()).slice(0, 1500); } catch { /* réponse déjà consommée/fermée */ }
  }
  appels.push({ methode: req.method(), url: res.url(), status: res.status(), contentType, corps });
});

console.log(`Chargement de ${url} ...`);
try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
} catch (err) {
  console.log(`(goto a levé une erreur, on continue quand même : ${err.message})`);
}
await page.waitForTimeout(6000);

const titre = await page.title();
const texte = await page.evaluate(() => document.body.innerText);
console.log(`\nTitre : ${titre}`);
console.log('--- Texte visible (tronqué à 1000 caractères) ---');
console.log(texte.slice(0, 1000));

console.log(`\n--- ${appels.length} appel(s) XHR/fetch capturé(s) ---`);
for (const a of appels) {
  console.log(`\n[${a.status}] ${a.methode} ${a.url}`);
  if (a.corps) console.log(`  corps (extrait) : ${a.corps.replace(/\s+/g, ' ')}`);
}

await browser.close();
