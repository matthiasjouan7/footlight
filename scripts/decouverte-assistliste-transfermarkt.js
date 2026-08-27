// Découverte (lecture seule) : structure de la page "assistliste"
// (classement des passeurs) de transfermarkt.fr — confirmée existante par
// l'utilisateur sur National 2 groupe A (FR4A) :
// https://www.transfermarkt.fr/championnat-national-2-groupe-a/assistliste/wettbewerb/FR4A/saison_id/2026
// Vérifie la structure (en-têtes, lignes) pour Ligue 3, National 1 et
// National 2, et si le slug de l'URL (partie SEO avant "/assistliste/")
// doit correspondre exactement au code ou est flexible.
import { chromium } from 'playwright';

const URLS = (process.env.URLS || 'https://www.transfermarkt.fr/championnat-national-2-groupe-a/assistliste/wettbewerb/FR4A/saison_id/2026')
  .split(',').map((u) => u.trim()).filter(Boolean);

const browser = await chromium.launch();
const page = await browser.newPage({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  locale: 'fr-FR',
});

for (const url of URLS) {
  console.log(`\n=== ${url} ===`);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  console.log(`Titre : "${await page.title()}"`);

  const entetes = await page.evaluate(() => {
    const table = document.querySelector('table.items');
    if (!table) return null;
    return [...table.querySelectorAll('thead th')].map((th) => th.textContent.trim());
  });
  console.log(`En-têtes de colonnes : ${JSON.stringify(entetes)}`);

  // Ligne détaillée avec les liens (nom joueur + club) pour comprendre la
  // structure DOM exacte à utiliser dans le vrai script de synchro.
  const lignes = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('table.items > tbody > tr')].slice(0, 15);
    return rows.map((row) => {
      const cells = [...row.querySelectorAll('td')].map((td) => td.textContent.trim());
      const lienJoueur = row.querySelector('td.hauptlink a, a.spielprofil_tooltip');
      const lienClub = row.querySelector('td img.tiny_wappen, td a[title]');
      return {
        cells,
        nomJoueur: lienJoueur ? lienJoueur.textContent.trim() : null,
        club: lienClub ? lienClub.getAttribute('title') : null,
      };
    });
  });
  console.log(`${lignes.length} ligne(s) :`);
  lignes.forEach((l) => console.log(JSON.stringify(l)));
}

await browser.close();
