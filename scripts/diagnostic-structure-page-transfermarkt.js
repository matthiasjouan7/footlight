// Diagnostic lecture seule : sur les pages spielbericht d'Alençon
// (4966813, 4966817), le script de synchro ne trouve que des <table>
// "ersatzbank" (banc de remplaçants) à 6 lignes mais 0 nom extrait — la
// composition titulaire n'est peut-être pas dans une <table> du tout
// (souvent un schéma de terrain en divs chez Transfermarkt), et même le
// banc semble avoir une structure de colonnes différente de celle
// attendue (exactement 2 colonnes). Ce script dump la structure réelle
// pour trouver où sont vraiment les noms des titulaires.
import { chromium } from 'playwright';

const URL = 'https://www.transfermarkt.fr/spielbericht/index/spielbericht/4966813';

const browser = await chromium.launch();
const page = await browser.newPage({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' });
await page.goto(URL, { waitUntil: 'networkidle', timeout: 45000 });
await page.waitForTimeout(500);

console.log(`Titre : "${await page.title()}"\n`);

// 1. Contenu brut complet des tables "ersatzbank" (toutes les colonnes,
// pas seulement l[1] comme le fait le script de synchro).
const ersatzbank = await page.evaluate(() => {
  return [...document.querySelectorAll('table.ersatzbank')].map((t) => ({
    lignes: [...t.querySelectorAll('tr')].map((tr) => [...tr.querySelectorAll('td,th')].map((td) => (td.textContent || '').trim())),
  }));
});
console.log('--- Contenu brut des tables .ersatzbank ---');
console.log(JSON.stringify(ersatzbank, null, 1).slice(0, 3000));

// 2. Recherche de sélecteurs candidats pour la composition titulaire
// (schéma de terrain / formation), courants chez Transfermarkt.
const candidats = await page.evaluate(() => {
  const selecteurs = [
    '.large-8', '.formation-player-name', '[class*="formation"]',
    '[class*="aufstellung" i]', '.sb-formation', '.large-6.columns',
    '.box-content', '[data-viewport="Aufstellung"]', '.responsive-table',
  ];
  const resultat = {};
  for (const sel of selecteurs) {
    const els = document.querySelectorAll(sel);
    resultat[sel] = { count: els.length, exempleTexte: els.length ? (els[0].textContent || '').trim().slice(0, 150) : null };
  }
  return resultat;
});
console.log('\n--- Sélecteurs candidats pour la composition titulaire ---');
console.log(JSON.stringify(candidats, null, 1));

// 3. Titre des sections de la page (souvent "Aufstellung" / "Compositions")
const titresSections = await page.evaluate(() => {
  return [...document.querySelectorAll('h2, .content-box-headline, .sb-formation-headline')].map((el) => (el.textContent || '').trim()).filter(Boolean);
});
console.log('\n--- Titres de section trouvés sur la page ---');
console.log(titresSections.join(' | '));

await browser.close();
