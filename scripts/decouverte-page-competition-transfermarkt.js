// Découverte (lecture seule) : sur une page de compétition transfermarkt.fr
// (ex: FR3 pour Ligue 3), trouve le lien vers le classement des "meilleurs
// passeurs" (assists), et liste les clubs de la compétition (utile pour
// vérifier plus tard si la lettre de groupe transfermarkt.fr correspond à
// la nôtre, dérivée de lequipe.fr/FFF — rien ne garantit qu'elles soient
// identiques).
import { chromium } from 'playwright';

const CODES = (process.env.CODES || 'FR3').split(',').map((c) => c.trim()).filter(Boolean);

const browser = await chromium.launch();
const page = await browser.newPage({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  locale: 'fr-FR',
});

for (const code of CODES) {
  const url = `https://www.transfermarkt.fr/wettbewerb/startseite/wettbewerb/${code}`;
  console.log(`\n=== ${code} (${url}) ===`);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  console.log(`Titre : "${await page.title()}"`);

  // Liens de menu/sous-page (onglets "Vainqueurs", "Buteurs", "Passeurs"...).
  const liensMenu = await page.evaluate(() => {
    const anchors = [...document.querySelectorAll('a')];
    return anchors
      .filter((a) => /passeur|vorlage|assist/i.test(a.textContent) || /passeur|vorlage|assist/i.test(a.getAttribute('href') || ''))
      .map((a) => ({ texte: a.textContent.trim(), href: a.getAttribute('href') }));
  });
  console.log(`Lien(s) "passeurs"/"assists" trouvé(s) : ${liensMenu.length}`);
  liensMenu.forEach((l) => console.log(`  "${l.texte}" -> ${l.href}`));

  // Clubs listés sur la page (table des clubs de la compétition).
  const clubs = await page.evaluate(() => {
    const cells = [...document.querySelectorAll('table.items td.hauptlink a, table.items td.zentriert a')];
    const noms = cells.map((a) => a.textContent.trim()).filter(Boolean);
    return [...new Set(noms)];
  });
  console.log(`${clubs.length} club(s) détecté(s) sur la page :`);
  clubs.forEach((c) => console.log(`  ${c}`));
}

await browser.close();
