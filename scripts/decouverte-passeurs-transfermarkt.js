// Découverte (lecture seule) : cherche sur transfermarkt.fr les pages de
// compétition pour Ligue 3, National 1 et National 2 (recherche + inspection
// du menu compétition, pour trouver le lien "Meilleurs passeurs" / assists),
// avant de construire un vrai script de synchro. transfermarkt.fr nécessite
// un navigateur headless (fetch() direct renvoie une page vide, statut 202 —
// même constat que decouverte-effectif-transfermarkt.js).
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  locale: 'fr-FR',
});

const REQUETES = ['Ligue 3', 'National 1', 'National 2'];

for (const requete of REQUETES) {
  console.log(`\n=== Recherche : "${requete}" ===`);
  const url = `https://www.transfermarkt.fr/schnellsuche/ergebnis/schnellsuche?query=${encodeURIComponent(requete)}`;
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  console.log(`Titre page résultats : "${await page.title()}"`);

  const liens = await page.evaluate(() => {
    const anchors = [...document.querySelectorAll('a[href*="/wettbewerb/"]')];
    return anchors.map((a) => ({ texte: a.textContent.trim(), href: a.getAttribute('href') }))
      .filter((l) => l.texte);
  });
  console.log(`${liens.length} lien(s) de compétition trouvé(s) :`);
  const vus = new Set();
  for (const l of liens) {
    const cle = `${l.texte}|${l.href}`;
    if (vus.has(cle)) continue;
    vus.add(cle);
    console.log(`  "${l.texte}" -> ${l.href}`);
  }
}

await browser.close();
