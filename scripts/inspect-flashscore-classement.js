// Inspection (lecture seule) de la page classement flashscore.fr d'une
// compétition (ex: National 1 Groupe A), pour récupérer la liste des clubs
// et leurs URLs de fiche club — nécessaire avant de boucler le scraping
// d'effectif sur tous les clubs d'un championnat.
import { chromium } from 'playwright';

const targetUrl = process.env.TARGET_URL;
if (!targetUrl) { console.error('TARGET_URL manquant.'); process.exit(1); }

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 60000 });

console.log(`Titre de la page : "${await page.title()}"`);

const result = await page.evaluate(() => {
  // Les pages de classement flashscore ont généralement des liens
  // /equipe/nom-club/ID/ pour chaque ligne du tableau.
  const liens = [...document.querySelectorAll('a[href*="/equipe/"]')]
    .map((a) => ({ text: a.textContent.trim(), href: a.getAttribute('href') }))
    .filter((l) => l.text && l.href);
  const uniques = [...new Map(liens.map((l) => [l.href, l])).values()];
  return uniques;
});

console.log(`\n${result.length} lien(s) club unique(s) trouvé(s) :`);
result.forEach((l) => console.log(` - "${l.text}" -> ${l.href}`));

await browser.close();
