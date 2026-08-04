// Diagnostic (lecture seule) : pourquoi un joueur apparaît-il en double dans
// l'effectif extrait de flashscore.fr ? Affiche toutes les lignes brutes
// dont le nom contient le motif recherché, avec leur position/poste et le
// HTML brut de la ligne, pour comprendre l'origine du doublon.
import { chromium } from 'playwright';

const targetUrl = process.env.TARGET_URL;
const motif = (process.env.MOTIF || 'romder').toLowerCase();
if (!targetUrl) { console.error('TARGET_URL manquant.'); process.exit(1); }

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 60000 });

const result = await page.evaluate((motif) => {
  const groupes = [...document.querySelectorAll('.lineupTable--soccer')];
  const trouvés = [];
  groupes.forEach((groupe) => {
    const poste = groupe.querySelector('.lineupTable__title')?.textContent.trim() || null;
    const rows = [...groupe.querySelectorAll('.lineupTable__row')];
    rows.forEach((row) => {
      const nom = row.querySelector('.lineupTable__cell--name')?.textContent.trim() || '';
      if (nom.toLowerCase().includes(motif)) {
        trouvés.push({ poste, nom, html: row.outerHTML.slice(0, 1500) });
      }
    });
  });
  // Cherche aussi ailleurs sur la page, hors des tables d'effectif classées
  // par poste (au cas où le doublon viendrait d'une autre section, ex: un
  // onglet "Filtre" additionnel caché).
  const partout = [...document.querySelectorAll('a[href*="/joueur/"]')]
    .filter((a) => a.textContent.toLowerCase().includes(motif))
    .map((a) => ({ text: a.textContent.trim(), href: a.getAttribute('href'), visible: a.offsetParent !== null }));

  return { trouvés, partout };
}, motif);

console.log(`${result.trouvés.length} ligne(s) dans les tables d'effectif contenant "${motif}" :`);
result.trouvés.forEach((r, i) => {
  console.log(`\n--- occurrence #${i} (poste: ${r.poste}) ---`);
  console.log(r.html);
});

console.log(`\n${result.partout.length} lien(s) joueur ailleurs sur la page contenant "${motif}" :`);
result.partout.forEach((l) => console.log(` - "${l.text}" -> ${l.href} (visible: ${l.visible})`));

await browser.close();
