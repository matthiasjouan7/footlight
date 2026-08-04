// Diagnostic (lecture seule) : le sélecteur .lineupTable--soccer ne matche
// plus rien, alors que le texte de la page (confirmé via
// inspect-flashscore-page.js sur Caen) montre bien un effectif rendu
// (Gardiens/Défenseurs/Milieux/Attaquants, colonnes # NOM AGE MIN...).
// flashscore.fr a donc renommé les classes CSS. Ce script localise la vraie
// structure actuelle en partant du texte des en-têtes de colonnes ("NOM"),
// pour trouver les classes réelles à utiliser dans le scraper.
import { chromium } from 'playwright';

const targetUrl = process.env.TARGET_URL;
if (!targetUrl) { console.error('TARGET_URL manquant.'); process.exit(1); }

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(3000);

const rapport = await page.evaluate(() => {
  const cheminClasses = (el) => {
    const chemin = [];
    let cur = el;
    let depth = 0;
    while (cur && depth < 6) {
      chemin.push(`${cur.tagName.toLowerCase()}${cur.className ? '.' + [...cur.classList].join('.') : ''}`);
      cur = cur.parentElement;
      depth++;
    }
    return chemin;
  };

  // Localise les en-têtes de colonne "NOM" (texte exact, noeud propre).
  const nomHeaders = [...document.querySelectorAll('*')].filter((el) =>
    el.children.length === 0 && el.textContent.trim() === 'NOM'
  );

  const resultats = nomHeaders.slice(0, 3).map((el) => ({
    cheminDepuisNOM: cheminClasses(el),
  }));

  // Localise aussi un nom de joueur connu pour remonter depuis une ligne.
  const ligneRomder = [...document.querySelectorAll('*')].find((el) =>
    el.children.length === 0 && el.textContent.trim() === 'Romder Mathis'
  );
  const cheminRomder = ligneRomder ? cheminClasses(ligneRomder) : null;

  return { nbHeaders: nomHeaders.length, resultats, cheminRomder };
});

console.log(`${rapport.nbHeaders} en-tête(s) "NOM" trouvé(s).`);
rapport.resultats.forEach((r, i) => {
  console.log(`\n--- Chemin depuis en-tête NOM #${i} (du plus profond au plus englobant) ---`);
  r.cheminDepuisNOM.forEach((c) => console.log(`  ${c}`));
});

if (rapport.cheminRomder) {
  console.log(`\n--- Chemin depuis "Romder Mathis" ---`);
  rapport.cheminRomder.forEach((c) => console.log(`  ${c}`));
} else {
  console.log(`\n"Romder Mathis" non trouvé sur cette page.`);
}

await browser.close();
