// Diagnostic lecture seule : structure de la page FFF du calendrier
// National 1 groupe C (fournie par l'utilisateur, seule source à jour pour
// l'instant après le repêchage d'Union Foot de Touraine dans une poule à
// 17 équipes). Teste d'abord un simple fetch (cheerio) ; si le contenu est
// vide/coquille JS, retente avec un navigateur (Playwright) pour voir le
// rendu côté client.
import * as cheerio from 'cheerio';
import { chromium } from 'playwright';

const URL = 'https://epreuves.fff.fr/competition/engagement/2-n1/phase/1/3/resultats-et-calendrier';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'fr-FR,fr;q=0.9',
};

console.log('--- Tentative 1 : fetch brut ---');
const res = await fetch(URL, { headers: HEADERS });
console.log(`Statut : ${res.status}`);
const html = await res.text();
console.log(`Taille HTML : ${html.length} caractères`);
const $ = cheerio.load(html);
console.log(`Titre : "${$('title').text().trim()}"`);
console.log(`Nombre de <table> : ${$('table').length}`);
console.log(`"Touraine" présent dans le HTML brut : ${html.toLowerCase().includes('touraine')}`);
console.log('\nAperçu body (1000 premiers caractères) :');
console.log($('body').text().replace(/\s+/g, ' ').trim().slice(0, 1000));

console.log('\n\n--- Tentative 2 : navigateur (Playwright) ---');
const browser = await chromium.launch(process.env.PW_EXECUTABLE_PATH ? { executablePath: process.env.PW_EXECUTABLE_PATH } : {});
const page = await browser.newPage();
await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(2000);
const titreRendu = await page.title();
console.log(`Titre rendu : "${titreRendu}"`);
const texteRendu = await page.evaluate(() => document.body.innerText);
console.log(`"Touraine" présent dans le rendu : ${texteRendu.toLowerCase().includes('touraine')}`);
console.log(`Nombre de <table> rendues : ${await page.locator('table').count()}`);
console.log('\nAperçu du texte rendu (1500 premiers caractères) :');
console.log(texteRendu.replace(/\s+/g, ' ').trim().slice(0, 1500));

// Dump des classes des conteneurs les plus fréquents, pour repérer la
// structure d'une ligne de match si ce n'est pas une <table>.
const classesFrequentes = await page.evaluate(() => {
  const compte = {};
  document.querySelectorAll('[class]').forEach((el) => {
    const cls = el.getAttribute('class');
    if (cls) compte[cls] = (compte[cls] || 0) + 1;
  });
  return Object.entries(compte).sort((a, b) => b[1] - a[1]).slice(0, 30);
});
console.log('\n30 classes les plus fréquentes (classe: nombre) :');
for (const [cls, n] of classesFrequentes) console.log(`  ${n}x "${cls}"`);

await browser.close();
