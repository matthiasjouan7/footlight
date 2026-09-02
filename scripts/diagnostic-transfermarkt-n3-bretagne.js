// Diagnostic lecture seule : teste si Transfermarkt est accessible depuis
// les runners GitHub Actions (contrairement à la session interactive, qui
// est bloquée par la politique réseau de son propre proxy — deux réseaux
// différents). Si oui, vérifie la structure de la page "spieltag"
// (calendrier d'une journée) pour National 3 Bretagne (wettbewerb=FR5E),
// en extrait les liens vers les feuilles de match ("spielbericht"), puis
// ouvre la première pour confirmer que la composition/buts/cartons/
// remplacements sont bien exploitables (même logique de calcul des
// minutes jouées que pour FFF : titulaire non remplacé -> 90, remplacé ->
// minute de sortie, entrant -> 90 - minute d'entrée).
import { chromium } from 'playwright';

const URL_JOURNEE = 'https://www.transfermarkt.fr/championnat-national-3-bretagne/spieltag/wettbewerb/FR5E/saison_id/2026/spieltag/1';

const browser = await chromium.launch();
const page = await browser.newPage({ locale: 'fr-FR', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36' });

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
console.log(`Titre de page : "${await page.title()}"`);

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
console.log(`Titre : "${await page.title()}"`);

const donnees = await page.evaluate(() => {
  const texteBrut = document.body.innerText;
  return { longueurTexte: texteBrut.length, extrait: texteBrut.slice(0, 1500) };
});
console.log(`\nLongueur du texte visible : ${donnees.longueurTexte} caractères.`);
console.log(`\nExtrait (1500 premiers caractères) :\n${donnees.extrait}`);

await browser.close();
