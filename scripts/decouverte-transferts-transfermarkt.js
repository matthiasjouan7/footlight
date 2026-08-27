// Découverte (lecture seule) : structure de la page "letztetransfers"
// (derniers transferts) de transfermarkt.fr pour une compétition. Pourrait
// servir à détecter automatiquement qu'un joueur FootLight a changé de
// club/niveau (point de vigilance récurrent : mettre à jour le niveau lors
// d'un transfert), en listant les arrivées/départs récents d'un groupe.
import { chromium } from 'playwright';

const url = process.env.TARGET_URL || 'https://www.transfermarkt.fr/championnat-national-2-groupe-a/letztetransfers/wettbewerb/FR4A';

const browser = await chromium.launch();
const page = await browser.newPage({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  locale: 'fr-FR',
});
await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
console.log(`URL : ${url}`);
console.log(`Titre : "${await page.title()}"`);

const nbTables = await page.evaluate(() => document.querySelectorAll('table.items').length);
console.log(`Nombre de <table class="items"> : ${nbTables}`);

// En-têtes de toutes les tables trouvées (arrivées / départs sont
// généralement deux tables séparées sur transfermarkt.fr).
const entetesTables = await page.evaluate(() => {
  return [...document.querySelectorAll('table.items')].map((t, i) => ({
    index: i,
    titreProche: t.closest('.box')?.querySelector('.content-box-headline')?.textContent.trim() || null,
    entetes: [...t.querySelectorAll('thead th')].map((th) => th.textContent.trim()),
  }));
});
console.log(`\n${JSON.stringify(entetesTables, null, 2)}`);

const lignes = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('table.items > tbody > tr')].slice(0, 30);
  return rows.map((row) => [...row.querySelectorAll('td')].map((td) => td.textContent.replace(/\s+/g, ' ').trim()));
});
console.log(`\n${lignes.length} ligne(s) (aperçu, 30 max) :`);
lignes.forEach((l) => console.log(JSON.stringify(l)));

await browser.close();
