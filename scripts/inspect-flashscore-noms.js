// Diagnostic (lecture seule) : liste les noms bruts extraits de l'effectif
// flashscore.fr d'un club, pour comprendre pourquoi un joueur FootLight
// connu (ex: Kaman Diarra à Chateauroux) n'a pas trouvé de correspondance
// via le rapprochement par mots exacts (memeNom).
import { chromium } from 'playwright';

const targetUrl = process.env.TARGET_URL;
if (!targetUrl) { console.error('TARGET_URL manquant.'); process.exit(1); }

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForSelector('.lineupTable--soccer', { timeout: 20000, state: 'attached' }).catch(() => {});

const effectif = await page.evaluate(() => {
  const groupes = [...document.querySelectorAll('.lineupTable--soccer')];
  return groupes.flatMap((groupe) => {
    const poste = groupe.querySelector('.lineupTable__title')?.textContent.trim() || null;
    const rows = [...groupe.querySelectorAll('.lineupTable__row')];
    return rows.map((row) => ({
      poste,
      nom: row.querySelector('.lineupTable__cell--name')?.textContent.trim() || null,
    }));
  }).filter((j) => j.nom);
});

console.log(`${effectif.length} ligne(s) brutes :`);
effectif.forEach((j) => console.log(` - [${j.poste}] "${j.nom}"`));

await browser.close();
