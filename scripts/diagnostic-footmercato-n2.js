// Diagnostic lecture seule : teste footmercato.net comme source
// alternative pour National 2, proposée par l'utilisateur en réponse au
// constat que Transfermarkt encode les minutes de but/carton/remplacement
// via un sprite CSS (background-position) plutôt qu'en texte, ce qui
// nécessiterait ~15 requêtes AJAX supplémentaires par match. Vérifie si
// footmercato.net est accessible depuis GitHub Actions, examine la page
// calendrier d'une journée, puis une page de détail de match pour voir si
// les minutes y sont du texte brut directement exploitable.
import { chromium } from 'playwright';

const URL_CALENDRIER = process.env.URL_CALENDRIER || 'https://www.footmercato.net/france/national-2/calendrier/8365150612397432064-journee-1';

const browser = await chromium.launch();
const page = await browser.newPage({ locale: 'fr-FR', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36' });

console.log(`Navigation vers : ${URL_CALENDRIER}\n`);
let statut = null;
try {
  const reponse = await page.goto(URL_CALENDRIER, { waitUntil: 'networkidle', timeout: 45000 });
  statut = reponse ? reponse.status() : null;
  console.log(`Statut HTTP : ${statut}`);
} catch (err) {
  console.log(`Erreur de navigation : ${err.message}`);
  await browser.close();
  process.exit(1);
}
console.log(`Titre de page : "${await page.title()}"`);

const texteVisible = await page.evaluate(() => document.body.innerText).catch(() => '');
console.log(`\nExtrait innerText (1200 premiers caractères) :\n${texteVisible.slice(0, 1200)}`);

const liensMatch = await page.evaluate(() => {
  const liens = [...document.querySelectorAll('a[href*="/match/"], a[href*="/rencontre/"], a[href*="/live/"]')];
  const uniques = new Map();
  for (const a of liens) uniques.set(a.getAttribute('href'), (a.textContent || '').trim());
  return [...uniques.entries()];
});
console.log(`\n${liensMatch.length} lien(s) potentiel(s) de match trouvé(s) :`);
for (const [href, texte] of liensMatch.slice(0, 20)) console.log(`  ${href}  ("${texte}")`);

if (liensMatch.length > 0) {
  const premierHref = liensMatch[0][0];
  const urlMatch = premierHref.startsWith('http') ? premierHref : `https://www.footmercato.net${premierHref}`;
  console.log(`\n########## Test de la page de match : ${urlMatch} ##########`);
  await page.goto(urlMatch, { waitUntil: 'networkidle', timeout: 45000 });
  console.log(`Titre : "${await page.title()}"`);
  const texteMatch = await page.evaluate(() => document.body.innerText).catch(() => '');
  console.log(`\nExtrait innerText de la page match (2000 premiers caractères) :\n${texteMatch.slice(0, 2000)}`);
}

await browser.close();
