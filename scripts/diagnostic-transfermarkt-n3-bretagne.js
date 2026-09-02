// Diagnostic lecture seule : teste l'accès Transfermarkt depuis les
// runners GitHub Actions et identifie la VRAIE compétition/groupe
// derrière un code "wettbewerb" donné — le slug textuel de l'URL
// ("championnat-national-3-bretagne" par ex.) n'est qu'une étiquette
// décorative non fiable (constaté : wettbewerb=FR5E affiche en réalité
// "Championnat National 2 - Groupe E", pas la Bretagne). Seul le titre
// réel de la page de feuille de match fait foi. Passer WETTBEWERB (et
// éventuellement SLUG/SAISON/SPIELTAG) en variables d'environnement pour
// tester d'autres codes.
import { chromium } from 'playwright';

const WETTBEWERB = process.env.WETTBEWERB || 'FR5E';
const SLUG = process.env.SLUG || 'championnat-national-3-bretagne';
const SAISON = process.env.SAISON || '2026';
const SPIELTAG = process.env.SPIELTAG || '1';

const URL_JOURNEE = `https://www.transfermarkt.fr/${SLUG}/spieltag/wettbewerb/${WETTBEWERB}/saison_id/${SAISON}/spieltag/${SPIELTAG}`;

const browser = await chromium.launch();
const page = await browser.newPage({ locale: 'fr-FR', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36' });

console.log(`Code wettbewerb testé : ${WETTBEWERB}`);
console.log(`Navigation vers : ${URL_JOURNEE}\n`);
let statut = null;
try {
  const reponse = await page.goto(URL_JOURNEE, { waitUntil: 'networkidle', timeout: 45000 });
  statut = reponse ? reponse.status() : null;
  console.log(`Statut HTTP : ${statut}`);
} catch (err) {
  console.log(`Erreur de navigation : ${err.message}`);
  await browser.close();
  process.exit(1);
}
console.log(`Titre de page (calendrier journée) : "${await page.title()}"`);

if (statut && statut >= 400) {
  const texte = await page.evaluate(() => document.body.innerText).catch(() => '');
  console.log(`\nExtrait (bloqué) :\n${texte.slice(0, 500)}`);
  await browser.close();
  process.exit(1);
}

const liensMatch = await page.evaluate(() => {
  const liens = [...document.querySelectorAll('a[href*="/spielbericht/index/spielbericht/"]')];
  const uniques = new Map();
  for (const a of liens) uniques.set(a.getAttribute('href'), (a.textContent || '').trim());
  return [...uniques.entries()];
});
console.log(`\n${liensMatch.length} lien(s) de feuille de match trouvé(s) sur la page journée :`);
for (const [href, texte] of liensMatch.slice(0, 20)) console.log(`  ${href}  ("${texte}")`);

if (liensMatch.length === 0) {
  console.log('\nAucun lien de match trouvé — impossible de continuer le test.');
  await browser.close();
  process.exit(0);
}

const premierHref = liensMatch[0][0];
const urlMatch = premierHref.startsWith('http') ? premierHref : `https://www.transfermarkt.fr${premierHref}`;
console.log(`\n########## Test de la feuille de match : ${urlMatch} ##########`);
await page.goto(urlMatch, { waitUntil: 'networkidle', timeout: 45000 });
const titreMatch = await page.title();
console.log(`Titre RÉEL de la feuille de match (fait foi, contrairement au slug de l'URL) : "${titreMatch}"`);

const donnees = await page.evaluate(() => {
  const texteBrut = document.body.innerText;
  return { longueurTexte: texteBrut.length, extrait: texteBrut.slice(0, 1500) };
});
console.log(`\nLongueur du texte visible : ${donnees.longueurTexte} caractères.`);
console.log(`\nExtrait (1500 premiers caractères) :\n${donnees.extrait}`);

await browser.close();
