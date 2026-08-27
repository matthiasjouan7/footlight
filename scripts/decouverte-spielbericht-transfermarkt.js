// Découverte (lecture seule) : structure d'une page "spielbericht" (rapport
// de match) transfermarkt.fr — contient-elle le score, les buteurs AVEC
// passeur, les compositions, cartons ? Fournie par l'utilisateur comme
// exemple. Utile comme source de calendrier/résultats/passes décisives par
// match, en complément ou alternative à lequipe.fr et foot-direct.com.
import { chromium } from 'playwright';

const url = process.env.TARGET_URL || 'https://www.transfermarkt.fr/asc-biesheim_us-lusitanos-saint-maur/index/spielbericht/4953965';

const browser = await chromium.launch();
const page = await browser.newPage({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  locale: 'fr-FR',
});
await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
console.log(`URL : ${url}`);
console.log(`Titre : "${await page.title()}"`);

// En-tête du match : équipes, score, date, compétition.
const entete = await page.evaluate(() => {
  const sb = document.querySelector('.sb-heading, .spielbericht-heading, [class*="matchresult"]');
  return sb ? sb.textContent.replace(/\s+/g, ' ').trim() : null;
});
console.log(`\nEn-tête détecté : ${entete}`);

// Cherche tout texte mentionnant un but avec passeur ("Passe décisive",
// icône assist, etc.) — structure exacte à déterminer.
const evenementsButs = await page.evaluate(() => {
  const candidats = [...document.querySelectorAll('[class*="sb-aktion"], [class*="goal"], [class*="ereignis"]')];
  return candidats.slice(0, 30).map((el) => el.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean);
});
console.log(`\n${evenementsButs.length} élément(s) "but/événement" détecté(s) :`);
evenementsButs.forEach((e) => console.log(`  ${e}`));

// Dump large du texte visible de la zone principale, pour repérer où sont
// les infos (score, buteurs+passeurs, compos) si les sélecteurs ci-dessus
// ne matchent rien.
const apercuTexte = await page.evaluate(() => document.querySelector('main, #main, .main')?.innerText?.slice(0, 4000) || document.body.innerText.slice(0, 4000));
console.log('\n--- Aperçu texte visible (4000 premiers caractères) ---');
console.log(apercuTexte);

await browser.close();
