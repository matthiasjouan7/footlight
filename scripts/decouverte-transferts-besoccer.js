// Découverte lecture seule (aucune écriture) : explore la page transferts
// de besoccer.com pour la compétition "CFA" (ancien nom de ce qui est
// aujourd'hui National 2 / National 3), pour voir si elle peut servir de
// source complémentaire à detecte-transferts-transfermarkt.js — même
// principe que les scripts decouverte-*-transfermarkt.js de ce dépôt.
import { chromium } from 'playwright';

const targetUrl = process.env.TARGET_URL || 'https://www.besoccer.com/competition/transfers/cfa';

const browser = await chromium.launch();
const page = await browser.newPage({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  locale: 'fr-FR',
});
await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 60000 });
console.log(`Page : "${await page.title()}"`);
console.log(`URL finale : ${page.url()}`);

const tables = await page.evaluate(() => {
  return [...document.querySelectorAll('table')].map((t, i) => ({
    index: i,
    headers: [...t.querySelectorAll('th')].map((th) => th.textContent.replace(/\s+/g, ' ').trim()),
    nbLignes: t.querySelectorAll('tbody tr').length,
    premiereLigne: (() => {
      const tr = t.querySelector('tbody tr');
      return tr ? [...tr.querySelectorAll('td')].map((td) => td.textContent.replace(/\s+/g, ' ').trim()) : null;
    })(),
  }));
});
console.log(`\n${tables.length} table(s) HTML trouvée(s) sur la page :`);
for (const t of tables) {
  console.log(`\n  Table #${t.index} — en-têtes : ${JSON.stringify(t.headers)}`);
  console.log(`  ${t.nbLignes} ligne(s), première ligne : ${JSON.stringify(t.premiereLigne)}`);
}

// Repli : si aucune table classique, cherche des blocs répétés (cartes de
// transfert) via des classes courantes sur ce type de site.
if (!tables.length) {
  const blocs = await page.evaluate(() => {
    const sel = ['.transfer', '[class*="transfer"]', '[class*="Transfer"]'];
    const found = {};
    for (const s of sel) found[s] = document.querySelectorAll(s).length;
    return found;
  });
  console.log('\nAucune table classique. Compte de sélecteurs candidats :', JSON.stringify(blocs, null, 2));
  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 3000));
  console.log('\nExtrait du texte de la page (3000 premiers caractères) :\n', bodyText);
}

await browser.close();
