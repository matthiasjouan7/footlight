// Découverte lecture seule (aucune écriture) : pour automatiser la
// synchro stats National 2 depuis la FFF (voir corrige-stats-hyeres-*-j1-fff.js,
// qui nécessitaient un lien de match fourni à la main par l'utilisateur),
// il faut d'abord comprendre comment naviguer sur epreuves.fff.fr depuis
// une compétition ("National 2 Poule A") jusqu'à la liste de ses matchs
// d'une journée donnée, sans connaître à l'avance l'URL d'un match précis.
//
// Explore epreuves.fff.fr : page d'accueil, recherche de compétition,
// structure d'une éventuelle page "calendrier" de compétition.
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  locale: 'fr-FR',
});

// 1. Repart du match connu pour trouver un lien vers la page "compétition"
// (souvent un fil d'Ariane ou un onglet "calendrier" au niveau poule).
const MATCH_CONNU = 'https://epreuves.fff.fr/competition/match/56635087-hyeres-f-c-football-club-limonest-dardilly-saint-didier/match';
await page.goto(MATCH_CONNU, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1500);
console.log(`Page match : "${await page.title()}"`);
console.log(`URL : ${page.url()}`);

const liensCompetition = await page.evaluate(() => {
  return [...document.querySelectorAll('a[href]')]
    .map((a) => ({ texte: a.textContent.replace(/\s+/g, ' ').trim(), href: a.href }))
    .filter((a) => /competition|poule|calendrier|classement|journee/i.test(a.href) || /national|poule|classement|calendrier/i.test(a.texte))
    .filter((a) => a.texte);
});
console.log(`\n${liensCompetition.length} lien(s) candidat(s) vers une page compétition/calendrier/classement :`);
liensCompetition.slice(0, 40).forEach((l) => console.log(`  "${l.texte}" -> ${l.href}`));

// 2. Essaie la page d'accueil et une recherche de compétition par nom.
await page.goto('https://epreuves.fff.fr/', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1500);
console.log(`\nPage d'accueil : "${await page.title()}"`);
const rechercheBox = await page.evaluate(() => {
  const inputs = [...document.querySelectorAll('input[type="search"], input[type="text"]')];
  return inputs.map((i) => ({ placeholder: i.placeholder, name: i.name, id: i.id }));
});
console.log(`Champ(s) de recherche détecté(s) :`, JSON.stringify(rechercheBox, null, 2));

await browser.close();
