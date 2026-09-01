// Diagnostic lecture seule : la synchro stats FFF va devoir construire
// l'URL de la page de chaque match à partir du seul id renvoyé par l'API
// /api/data/matches (le "slug" descriptif en fin d'URL n'est pas connu à
// l'avance). Vérifie si l'URL fonctionne sans slug (juste l'id), en la
// comparant à l'URL complète connue pour le match Hyères/Limonest
// (id=56635087).
import { chromium } from 'playwright';

const ID_CONNU = 56635087;
const URL_SANS_SLUG = `https://epreuves.fff.fr/competition/match/${ID_CONNU}/match`;
const URL_AVEC_SLUG = 'https://epreuves.fff.fr/competition/match/56635087-hyeres-f-c-football-club-limonest-dardilly-saint-didier/match';

const browser = await chromium.launch(process.env.PW_EXECUTABLE_PATH ? { executablePath: process.env.PW_EXECUTABLE_PATH } : {});
const page = await browser.newPage({ locale: 'fr-FR' });

for (const [label, url] of [['SANS slug', URL_SANS_SLUG], ['AVEC slug (référence)', URL_AVEC_SLUG]]) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1500);
  const titre = await page.title();
  const urlFinale = page.url();
  const contientHyeres = (await page.evaluate(() => document.body.innerText)).includes('HYERES');
  console.log(`${label} : titre="${titre}" urlFinale="${urlFinale}" contientHyeres=${contientHyeres}`);
}

await browser.close();
