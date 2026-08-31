// Découverte lecture seule (aucune écriture) : l'utilisateur a fourni
// directement l'URL de la page "résultats et calendrier" pour National 2
// (poule 5) : https://epreuves.fff.fr/competition/engagement/3-n2/phase/1/5/resultats-et-calendrier
// — confirme le schéma d'URL : engagement "3-n2" (vs "2-n1" pour National
// 1), phase "1", poule numérique (5 = groupe E si 1=A,2=B...).
//
// Explore cette page : liste des journées disponibles, liens de match par
// journée, et surtout si un sélecteur de poule permet ici de voir les 8
// groupes A-H de National 2 (contrairement au sélecteur limité à N1 trouvé
// sur la page National 1).
import { chromium } from 'playwright';

const URL_N2 = 'https://epreuves.fff.fr/competition/engagement/3-n2/phase/1/5/resultats-et-calendrier';

const browser = await chromium.launch();
const page = await browser.newPage({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  locale: 'fr-FR',
});
await page.goto(URL_N2, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(2000);
console.log(`Titre : "${await page.title()}"`);
console.log(`URL finale : ${page.url()}`);

const selects = await page.evaluate(() => {
  return [...document.querySelectorAll('select')].map((s) => ({
    id: s.id,
    options: [...s.options].map((o) => ({ value: o.value, texte: o.textContent.trim() })),
  }));
});
console.log(`\n${selects.length} <select> trouvé(s) :`, JSON.stringify(selects, null, 2));

// Sélecteur de journée éventuel (boutons, liens, ou select).
const journeeControls = await page.evaluate(() => {
  const candidats = [...document.querySelectorAll('a, button, [class*="journee" i], [class*="matchday" i]')]
    .filter((el) => /journ[ée]e?\s*\d+/i.test(el.textContent))
    .map((el) => ({ texte: el.textContent.replace(/\s+/g, ' ').trim(), tag: el.tagName, href: el.href || null }));
  return candidats.slice(0, 20);
});
console.log(`\n${journeeControls.length} contrôle(s) "journée" trouvé(s) :`, JSON.stringify(journeeControls, null, 2));

const liensMatchs = await page.evaluate(() => {
  return [...document.querySelectorAll('a[href*="/competition/match/"]')]
    .map((a) => a.href);
});
const liensUniques = [...new Set(liensMatchs)];
console.log(`\n${liensUniques.length} lien(s) de match unique(s) sur la page :`);
liensUniques.forEach((l) => console.log(`  ${l}`));

const extrait = await page.evaluate(() => document.body.innerText.slice(0, 1500));
console.log('\n--- Extrait du texte (1500 premiers caractères) ---\n', extrait);

await browser.close();
