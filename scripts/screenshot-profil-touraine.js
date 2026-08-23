// Diagnostic lecture seule : capture la vraie page profil en prod
// (footlight.fr) d'un joueur Union Foot Touraine pour voir directement ce
// que l'utilisateur signale ("2 calendriers"), plutôt que de deviner depuis
// les données seules (matchs_joueur et stats_saisons ne montrent aucun
// doublon pour Enzo Valentim — la cause est peut-être côté rendu/UI, pas
// données).
import { chromium } from 'playwright';

const JOUEUR_ID = process.env.JOUEUR_ID || 'ac0a7966-349a-4100-bc38-163f26606c61'; // Enzo Valentim
const URL_PROFIL = `https://footlight.fr/footlight-profil.html?id=${JOUEUR_ID}`;

const browser = await chromium.launch(process.env.PW_EXECUTABLE_PATH ? { executablePath: process.env.PW_EXECUTABLE_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1280, height: 4000 } });

const erreursConsole = [];
page.on('console', (msg) => { if (msg.type() === 'error') erreursConsole.push(msg.text()); });
page.on('pageerror', (err) => erreursConsole.push(`pageerror: ${err.message}`));

await page.goto(URL_PROFIL, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(2000);

// Compte les occurrences visibles du mot "calendrier" / "Calendrier" et des
// blocs de saison, pour quantifier la duplication avant la capture d'écran.
const texteVisible = await page.evaluate(() => document.body.innerText);
const occurrencesCalendrier = (texteVisible.match(/calendrier/gi) || []).length;
console.log(`Occurrences du mot "calendrier" dans le texte visible : ${occurrencesCalendrier}`);

const titresSaison = await page.evaluate(() => {
  return [...document.querySelectorAll('*')]
    .filter((el) => el.children.length === 0 && /2026-2027/.test(el.textContent || ''))
    .map((el) => el.textContent.trim())
    .filter((t, i, arr) => arr.indexOf(t) === i)
    .slice(0, 20);
});
console.log(`\nÉléments texte contenant "2026-2027" (${titresSaison.length}) :`);
for (const t of titresSaison) console.log(`  "${t}"`);

console.log(`\nErreurs console : ${erreursConsole.length}`);
for (const e of erreursConsole.slice(0, 10)) console.log(`  ${e}`);

await page.screenshot({ path: 'profil-touraine.png', fullPage: true });
console.log('\nCapture enregistrée : profil-touraine.png');

await browser.close();
