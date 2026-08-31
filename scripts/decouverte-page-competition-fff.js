// Découverte lecture seule (aucune écriture) : la découverte précédente a
// trouvé un lien "Toute la compétition en détail" pointant vers
// https://epreuves.fff.fr/competition/engagement/2-n1/phase/1/3 depuis la
// page du match Hyères/Limonest (National 1 groupe C). Explore cette page
// pour comprendre : comment les matchs de chaque journée y sont listés
// (avec leurs liens), et s'il existe un sélecteur permettant de changer de
// compétition/poule (pour éventuellement en déduire l'URL équivalente pour
// National 2, groupes A à H).
import { chromium } from 'playwright';

const URL_COMPETITION = 'https://epreuves.fff.fr/competition/engagement/2-n1/phase/1/3';

const browser = await chromium.launch();
const page = await browser.newPage({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  locale: 'fr-FR',
});
await page.goto(URL_COMPETITION, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(2000);
console.log(`Titre : "${await page.title()}"`);
console.log(`URL finale : ${page.url()}`);

// Onglets / menu de navigation (Calendrier, Classement, etc.)
const onglets = await page.evaluate(() => {
  return [...document.querySelectorAll('a[href], button')]
    .map((el) => ({ texte: el.textContent.replace(/\s+/g, ' ').trim(), href: el.href || null }))
    .filter((el) => el.texte && /calendrier|resultat|classement|journee|poule|groupe/i.test(el.texte));
});
console.log(`\n${onglets.length} onglet(s)/lien(s) de navigation candidat(s) :`);
onglets.slice(0, 30).forEach((o) => console.log(`  "${o.texte}" -> ${o.href}`));

// Liens vers des matchs directement sur cette page.
const liensMatchs = await page.evaluate(() => {
  return [...document.querySelectorAll('a[href*="/competition/match/"]')]
    .map((a) => ({ texte: a.textContent.replace(/\s+/g, ' ').trim(), href: a.href }));
});
console.log(`\n${liensMatchs.length} lien(s) vers une page de match trouvé(s) sur cette page :`);
liensMatchs.slice(0, 20).forEach((l) => console.log(`  "${l.texte}" -> ${l.href}`));

// Un sélecteur de poule/groupe/phase (dropdown) éventuel.
const selects = await page.evaluate(() => {
  return [...document.querySelectorAll('select')].map((s) => ({
    name: s.name, id: s.id,
    options: [...s.options].slice(0, 15).map((o) => ({ value: o.value, texte: o.textContent.trim() })),
  }));
});
console.log(`\n${selects.length} <select> trouvé(s) :`, JSON.stringify(selects, null, 2));

// Extrait de texte visible pour contexte général.
const extrait = await page.evaluate(() => document.body.innerText.slice(0, 2000));
console.log('\n--- Extrait du texte de la page (2000 premiers caractères) ---\n', extrait);

await browser.close();
