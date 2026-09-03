// Diagnostic lecture seule (v2) : le premier passage a montré que
// buts/cartons/remplacements ne sont pas dans des <table> mais dans une
// timeline (div.sb-zeitleiste-ereignisse), vide en texte/title visibles —
// l'info (minute, type d'événement, joueur) est probablement encodée via
// des attributs style (position horizontale = minute) / class (type
// d'icône) / data-* sur les enfants. Dump ciblé de cette structure, plus
// recherche de toutes les classes préfixées "sb-" (convention
// Transfermarkt "Spielbericht") pour repérer les conteneurs BUTS/
// REMPLACEMENTS/CARTONS visibles dans le rendu mais absents des <table>.
import { chromium } from 'playwright';

const URL_MATCH = process.env.URL_MATCH || 'https://www.transfermarkt.fr/spielbericht/index/spielbericht/4967173';

const browser = await chromium.launch();
const page = await browser.newPage({ locale: 'fr-FR', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36' });

await page.goto(URL_MATCH, { waitUntil: 'networkidle', timeout: 45000 });
console.log(`Titre : "${await page.title()}"\n`);

const timeline = await page.evaluate(() => {
  const conteneur = document.querySelector('.sb-zeitleiste-ereignisse');
  if (!conteneur) return null;
  return [...conteneur.querySelectorAll('*')].map((el) => ({
    tag: el.tagName,
    classe: el.className,
    style: el.getAttribute('style'),
    dataAttrs: [...el.attributes].filter((a) => a.name.startsWith('data-')).map((a) => `${a.name}="${a.value}"`).join(' '),
    texte: (el.textContent || '').trim().slice(0, 60),
  })).filter((el) => el.style || el.dataAttrs || el.texte);
});
console.log(`Enfants de .sb-zeitleiste-ereignisse (${timeline ? timeline.length : 0}) :`);
for (const el of timeline || []) console.log(`  <${el.tag} class="${el.classe}" style="${el.style || ''}" ${el.dataAttrs}> "${el.texte}"`);

const classesSb = await page.evaluate(() => {
  const toutes = new Set();
  for (const el of document.querySelectorAll('[class*="sb-"]')) {
    for (const c of el.className.split(' ')) if (c.startsWith('sb-')) toutes.add(c);
  }
  return [...toutes].sort();
});
console.log(`\n${classesSb.length} classe(s) "sb-*" unique(s) trouvée(s) sur la page :`);
console.log(`  ${classesSb.join(', ')}`);

const lignesAction = await page.evaluate(() => {
  return [...document.querySelectorAll('.sb-aktion')].map((el) => ({
    classe: el.className,
    html: el.outerHTML.slice(0, 1200),
  }));
});
console.log(`\n########## ${lignesAction.length} ligne(s) .sb-aktion (buts/cartons/remplacements) ##########`);
for (const l of lignesAction) console.log(`\nclass="${l.classe}"\n${l.html}\n`);

await browser.close();
