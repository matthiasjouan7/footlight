// Diagnostic lecture seule : localise précisément où sont les noms des 11
// titulaires sur une page spielbericht Transfermarkt (le diagnostic
// précédent a confirmé qu'ils ne sont dans aucune <table>, mais dans une
// zone [class*="aufstellung"]/[class*="formation"], probablement un schéma
// de terrain en divs). Dump le HTML brut de cette zone pour identifier le
// bon sélecteur avant tout correctif du script de synchro.
import { chromium } from 'playwright';

const URL = 'https://www.transfermarkt.fr/spielbericht/index/spielbericht/4966813';

const browser = await chromium.launch();
const page = await browser.newPage({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' });
await page.goto(URL, { waitUntil: 'networkidle', timeout: 45000 });
await page.waitForTimeout(500);

// Cherche le plus grand conteneur "aufstellung" (probablement le bloc
// entier avec les 2 équipes), puis dump son HTML pour lecture humaine.
const infoContainer = await page.evaluate(() => {
  const els = [...document.querySelectorAll('[class*="aufstellung" i]')];
  const tailles = els.map((el) => ({ classe: el.className, taille: el.outerHTML.length }));
  const plusGrand = els.reduce((a, b) => (a.outerHTML.length >= b.outerHTML.length ? a : b));
  return { tailles, htmlPlusGrand: plusGrand.outerHTML };
});
console.log('--- Tailles des éléments [class*="aufstellung"] ---');
console.log(JSON.stringify(infoContainer.tailles, null, 1));

console.log('\n--- HTML du plus grand conteneur (premiers 6000 caractères) ---');
console.log(infoContainer.htmlPlusGrand.slice(0, 6000));

// Cherche aussi des liens vers des profils joueur (/profil/spieler/<id>)
// dans cette zone, souvent le marqueur le plus fiable d'un nom de joueur
// chez Transfermarkt (indépendant de la classe CSS utilisée).
const liensJoueurs = await page.evaluate(() => {
  const zone = [...document.querySelectorAll('[class*="aufstellung" i], [class*="formation" i]')];
  const liens = new Set();
  for (const el of zone) {
    for (const a of el.querySelectorAll('a[href*="/profil/spieler/"]')) {
      liens.add(JSON.stringify({ texte: (a.textContent || '').trim(), href: a.getAttribute('href'), classeParent: a.closest('[class]')?.className || null }));
    }
  }
  return [...liens].slice(0, 40).map((s) => JSON.parse(s));
});
console.log(`\n--- ${liensJoueurs.length} lien(s) /profil/spieler/ trouvé(s) dans les zones aufstellung/formation ---`);
console.log(JSON.stringify(liensJoueurs, null, 1));

await browser.close();
