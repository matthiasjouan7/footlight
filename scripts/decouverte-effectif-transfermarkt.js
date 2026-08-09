// Découverte (lecture seule) de la structure d'une page effectif
// transfermarkt.fr : affiche ce qui a été détecté (nom, poste, date de
// naissance) pour valider les sélecteurs avant de construire un vrai script
// d'import. transfermarkt.fr renvoie une page vide (statut 202) à un simple
// fetch() — même constat qu'avec flashscore.fr — donc on utilise Playwright
// (navigateur headless) plutôt qu'une requête HTTP directe.
import { chromium } from 'playwright';

const startUrl = process.env.TARGET_URL;
if (!startUrl) { console.error('TARGET_URL manquant.'); process.exit(1); }

// La page "startseite" (accueil club) n'a pas l'effectif : on bascule vers
// "kader" (effectif), qui liste les joueurs avec poste/naissance/nationalité.
const kaderUrl = startUrl.includes('/kader/') ? startUrl : startUrl.replace('/startseite/', '/kader/');
console.log(`URL effectif : ${kaderUrl}`);

const browser = await chromium.launch();
const page = await browser.newPage({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  locale: 'fr-FR',
});
await page.goto(kaderUrl, { waitUntil: 'networkidle', timeout: 60000 });

const titre = await page.title();
console.log(`Titre de la page : "${titre}"`);

const nbTablesItems = await page.locator('table.items').count();
console.log(`Nombre de <table class="items">: ${nbTablesItems}`);

const lignes = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('table.items > tbody > tr')];
  return rows.map((row) => {
    const nomEl = row.querySelector('td.posrela a');
    const nom = nomEl ? nomEl.textContent.trim() : (row.querySelector('td.posrela')?.textContent.trim().split('\n')[0].trim() || '');
    const posteRows = row.querySelectorAll('td.posrela table.inline-table tr');
    const poste = posteRows.length > 1 ? posteRows[1].textContent.trim() : '';
    const zentriert = [...row.querySelectorAll('td.zentriert')].map((c) => c.textContent.trim());
    return { nom, poste, zentriert };
  }).filter((l) => l.nom);
});

console.log(`\n${lignes.length} ligne(s) joueur détectée(s) :`);
lignes.forEach((l) => console.log(JSON.stringify(l)));

if (!lignes.length) {
  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 1500));
  console.log('\nAucune ligne détectée — début du texte visible de la page :');
  console.log(bodyText);
}

await browser.close();
