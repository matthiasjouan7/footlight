// Diagnostic (lecture seule, aucune écriture) : pour une liste de clubs
// flashscore.fr, vérifie lesquels ont réellement une page "Effectif"
// exploitable (le sélecteur .lineupTable--soccer est correct, confirmé via
// inspect-flashscore-classes.js — certains clubs n'ont simplement pas cette
// page du tout et retombent sur l'onglet "Résumé"). Sert à savoir, avant de
// lancer des syncs individuelles, quels clubs valent la peine d'être
// synchronisés.
import { chromium } from 'playwright';

const clubsJson = process.env.CLUBS_JSON;
if (!clubsJson) { console.error('CLUBS_JSON manquant.'); process.exit(1); }
const clubs = JSON.parse(clubsJson);

const browser = await chromium.launch();
const resultats = [];

for (const { club, url } of clubs) {
  console.log(`... vérification de ${club}`);
  const page = await browser.newPage();
  page.setDefaultTimeout(20000);
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    // waitForSelector() attend par défaut que l'élément soit "visible" (taille
    // rendue non nulle) — flashscore semble garder le tableau d'effectif
    // attaché au DOM mais avec un rendu différé/conditionnel (constaté : même
    // Caen, dont les données sont confirmées présentes, échoue avec ce
    // critère). On vérifie donc la présence dans le DOM (state: 'attached'),
    // ce qui correspond à ce que page.evaluate() peut de toute façon lire.
    const rendu = await page.waitForSelector('.lineupTable--soccer', { timeout: 15000, state: 'attached' }).then(() => true).catch(() => false);
    const nbJoueurs = rendu
      ? await page.evaluate(() => document.querySelectorAll('.lineupTable--soccer .lineupTable__row').length)
      : 0;
    resultats.push({ club, url, effectif: rendu, nbJoueurs });
    console.log(`${rendu ? 'OK ' : 'NON'} ${club} : ${rendu ? `${nbJoueurs} joueur(s) dans l'effectif` : 'pas de page effectif'}`);
  } catch (e) {
    resultats.push({ club, url, effectif: false, erreur: e.message });
    console.log(`ERREUR ${club} : ${e.message}`);
  } finally {
    await page.close();
  }
}

const ok = resultats.filter((r) => r.effectif);
const non = resultats.filter((r) => !r.effectif);
console.log(`\nRésumé : ${ok.length}/${resultats.length} club(s) avec un effectif exploitable.`);
console.log(`Avec effectif : ${ok.map((r) => r.club).join(', ') || '(aucun)'}`);
console.log(`Sans effectif : ${non.map((r) => r.club).join(', ') || '(aucun)'}`);

await browser.close();
