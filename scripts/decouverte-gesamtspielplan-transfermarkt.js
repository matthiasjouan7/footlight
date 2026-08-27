// Découverte (lecture seule) : structure de la page "gesamtspielplan"
// (calendrier complet) de transfermarkt.fr — contient-elle toutes les
// rencontres de la saison avec dates, équipes, et scores (si déjà joués) ?
// Utile comme source potentielle de calendrier/résultats en complément de
// lequipe.fr (sync-lequipe-to-calendrier.js / sync-lequipe-match-stats.js).
import { chromium } from 'playwright';

const url = process.env.TARGET_URL || 'https://www.transfermarkt.fr/championnat-national-2-groupe-a/gesamtspielplan/wettbewerb/FR4A/saison_id/2026';

const browser = await chromium.launch();
const page = await browser.newPage({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  locale: 'fr-FR',
});
await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
console.log(`URL : ${url}`);
console.log(`Titre : "${await page.title()}"`);

// Combien de "journées" / blocs de matchs sont affichés sur cette seule
// page (calendrier complet = potentiellement tout dans une seule requête,
// contrairement à lequipe.fr qui affiche une journée à la fois).
const nbBlocsJournee = await page.evaluate(() => document.querySelectorAll('.box').length);
console.log(`Nombre de blocs ".box" (journées ?) : ${nbBlocsJournee}`);

const matchs = await page.evaluate(() => {
  const lignes = [...document.querySelectorAll('table.spieltagsansicht tr, table.livetabelle tr, .responsive-table tr')];
  return lignes.slice(0, 40).map((tr) => tr.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean);
});
console.log(`\n${matchs.length} ligne(s) de match (aperçu, 40 max) :`);
matchs.forEach((m) => console.log(`  ${m}`));

// Structure DOM détaillée d'une seule "box" de journée, pour comprendre
// comment extraire proprement date/équipes/score.
const detailPremiereBoxe = await page.evaluate(() => {
  const box = document.querySelector('.box');
  if (!box) return null;
  return {
    titre: box.querySelector('.content-box-headline')?.textContent.trim() || null,
    html: box.innerHTML.slice(0, 2000),
  };
});
console.log(`\n--- Détail de la 1re box ---`);
console.log(JSON.stringify(detailPremiereBoxe, null, 2).slice(0, 3000));

await browser.close();
