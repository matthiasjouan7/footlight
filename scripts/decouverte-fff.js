// Découverte (lecture seule) : récupère une page epreuves.fff.fr (portail
// officiel FFF) et affiche sa structure brute (titre, texte visible,
// éventuels liens de navigation calendrier/résultats/journées) pour évaluer
// si ce portail peut servir de source de données (score, buteurs, cartons,
// compositions) plus riche/officielle que lequipe.fr.
import { chromium } from 'playwright';

const url = process.env.TARGET_URL;
if (!url) { console.error('TARGET_URL manquant.'); process.exit(1); }

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

const titre = await page.title();
console.log(`Titre : ${titre}`);
console.log(`URL finale : ${page.url()}\n`);

const texte = await page.evaluate(() => document.body.innerText);
console.log('--- Texte visible de la page (tronqué à 4000 caractères) ---');
console.log(texte.slice(0, 4000));

const liens = await page.evaluate(() =>
  [...document.querySelectorAll('a[href]')]
    .map((a) => ({ texte: a.textContent.trim(), href: a.href }))
    .filter((l) => l.texte)
);
console.log('\n--- Liens trouvés sur la page ---');
for (const l of liens.slice(0, 80)) console.log(`  "${l.texte}" -> ${l.href}`);

await browser.close();
