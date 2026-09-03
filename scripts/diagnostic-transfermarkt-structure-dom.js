// Diagnostic lecture seule : dump structuré (tables HTML avec cellules
// séparées, pas innerText qui perd les colonnes) d'une feuille de match
// Transfermarkt, pour concevoir les sélecteurs du futur parseur de
// secours (utilisé si FFF est indisponible, comme actuellement depuis
// ~24h : "APPLICATION MOMENTANÉMENT INDISPONIBLE"). Cherche aussi les
// éléments porteurs d'un attribut title/alt (les minutes de la
// chronologie sont probablement encodées ainsi plutôt qu'en texte visible
// brut, absentes de l'extraction innerText testée précédemment).
import { chromium } from 'playwright';

const URL_MATCH = process.env.URL_MATCH || 'https://www.transfermarkt.fr/spielbericht/index/spielbericht/4967173';

const browser = await chromium.launch();
const page = await browser.newPage({ locale: 'fr-FR', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36' });

console.log(`Navigation vers : ${URL_MATCH}\n`);
await page.goto(URL_MATCH, { waitUntil: 'networkidle', timeout: 45000 });
console.log(`Titre : "${await page.title()}"\n`);

const tables = await page.evaluate(() => {
  return [...document.querySelectorAll('table')].map((t, i) => ({
    index: i,
    classe: t.className,
    lignes: [...t.querySelectorAll('tr')].slice(0, 15).map((tr) =>
      [...tr.querySelectorAll('td,th')].map((td) => (td.textContent || '').trim().replace(/\s+/g, ' '))
    ),
  }));
});
console.log(`${tables.length} table(s) HTML trouvée(s) :\n`);
for (const t of tables) {
  console.log(`--- Table #${t.index} (class="${t.classe}") ---`);
  for (const ligne of t.lignes) console.log(`  [${ligne.join(' | ')}]`);
  console.log('');
}

const elementsAvecTitre = await page.evaluate(() => {
  return [...document.querySelectorAll('[title]')].slice(0, 60).map((el) => ({
    tag: el.tagName,
    classe: el.className,
    titre: el.getAttribute('title'),
  }));
});
console.log(`\n${elementsAvecTitre.length} élément(s) avec attribut title (extrait) :`);
for (const el of elementsAvecTitre) console.log(`  <${el.tag} class="${el.classe}"> title="${el.titre}"`);

const conteneursChrono = await page.evaluate(() => {
  const candidats = [...document.querySelectorAll('[class*="verlauf"], [class*="chrono"], [class*="timeline"], [class*="minute"]')];
  return candidats.slice(0, 20).map((el) => ({ tag: el.tagName, classe: el.className, texte: (el.textContent || '').trim().slice(0, 100) }));
});
console.log(`\n${conteneursChrono.length} conteneur(s) au nom évocateur (verlauf/chrono/timeline/minute) :`);
for (const c of conteneursChrono) console.log(`  <${c.tag} class="${c.classe}"> "${c.texte}"`);

await browser.close();
