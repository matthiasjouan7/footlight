// Diagnostic lecture seule : découvre les identifiants de calendrier
// footmercato pour les 8 groupes de National 2 (l'équivalent du gpNo de
// FFF). Le calendrier "journée 1" testé pour Nancy (id
// 8365150612397432064) s'est avéré spécifique au Groupe E ("Groupe E -
// journée 1" confirmé sur la page de match). Cherche la page compétition
// National 2 pour trouver les liens vers les calendriers des autres
// groupes (probablement un sélecteur de poule/groupe sur la page
// classement ou calendrier).
import { chromium } from 'playwright';

const URL_COMPETITION = process.env.URL_COMPETITION || 'https://www.footmercato.net/france/national-2';

const browser = await chromium.launch();
const page = await browser.newPage({ locale: 'fr-FR', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36' });

console.log(`Navigation vers : ${URL_COMPETITION}\n`);
let statut = null;
try {
  const reponse = await page.goto(URL_COMPETITION, { waitUntil: 'networkidle', timeout: 45000 });
  statut = reponse ? reponse.status() : null;
  console.log(`Statut HTTP : ${statut}`);
} catch (err) {
  console.log(`Erreur de navigation : ${err.message}`);
  await browser.close();
  process.exit(1);
}
console.log(`Titre : "${await page.title()}"`);
console.log(`URL finale : ${page.url()}\n`);

const texte = await page.evaluate(() => document.body.innerText).catch(() => '');
console.log(`Extrait innerText (2000 premiers caractères) :\n${texte.slice(0, 2000)}\n`);

const liensCalendrier = await page.evaluate(() => {
  const liens = [...document.querySelectorAll('a[href*="/calendrier/"], a[href*="/classement"], a[href*="groupe"], a[href*="poule"]')];
  const uniques = new Map();
  for (const a of liens) uniques.set(a.getAttribute('href'), (a.textContent || '').trim());
  return [...uniques.entries()];
});
console.log(`${liensCalendrier.length} lien(s) calendrier/classement/groupe/poule trouvé(s) :`);
for (const [href, texte2] of liensCalendrier.slice(0, 40)) console.log(`  ${href}  ("${texte2}")`);

// Cherche aussi un éventuel sélecteur de groupe (select/onglets) sur la page.
const selecteurs = await page.evaluate(() => {
  return [...document.querySelectorAll('select, [class*="groupe"], [class*="poule"], [class*="pool"]')].slice(0, 20).map((el) => ({
    tag: el.tagName, classe: el.className, texte: (el.textContent || '').trim().slice(0, 200),
  }));
});
console.log(`\n${selecteurs.length} sélecteur(s)/conteneur(s) évocateur(s) (select/groupe/poule/pool) :`);
for (const s of selecteurs) console.log(`  <${s.tag} class="${s.classe}"> "${s.texte}"`);

await browser.close();
