// Découverte lecture seule (aucune écriture) : l'utilisateur a repéré que
// epreuves.fff.fr publie la composition d'équipe (titulaires/remplaçants)
// pour chaque match officiel — une source potentiellement bien meilleure
// que lequipe.fr (qui n'a pas toujours de feuille de match détaillée pour
// les divisions gérées par les ligues régionales/FFF). Explore la
// structure de la page match FFF donnée par l'utilisateur pour voir si les
// compositions sont exploitables automatiquement (sélecteurs, texte brut).
import { chromium } from 'playwright';

const targetUrl = process.env.TARGET_URL
  || 'https://epreuves.fff.fr/competition/match/56635087-hyeres-f-c-football-club-limonest-dardilly-saint-didier/match';

const browser = await chromium.launch();
const page = await browser.newPage({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  locale: 'fr-FR',
});
await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 60000 });
console.log(`Page : "${await page.title()}"`);
console.log(`URL finale : ${page.url()}`);

// Laisse le temps à un éventuel rendu JS tardif (compositions souvent
// chargées après le reste de la page).
await page.waitForTimeout(2000);

const infos = await page.evaluate(() => {
  const texteBrut = document.body.innerText;
  const motsClesCompo = ['compo', 'titulaire', 'remplaçant', 'remplacant', 'effectif'];
  const presenceMots = Object.fromEntries(motsClesCompo.map((m) => [m, texteBrut.toLowerCase().includes(m)]));

  const selecteursCandidats = ['[class*="compo" i]', '[class*="lineup" i]', '[class*="effectif" i]', '[class*="player" i]', '[class*="joueur" i]', 'table'];
  const comptesSelecteurs = {};
  for (const s of selecteursCandidats) comptesSelecteurs[s] = document.querySelectorAll(s).length;

  return { presenceMots, comptesSelecteurs, longueurTexte: texteBrut.length };
});
console.log('\nMots-clés détectés dans le texte de la page :', JSON.stringify(infos.presenceMots, null, 2));
console.log('\nCompte de sélecteurs candidats :', JSON.stringify(infos.comptesSelecteurs, null, 2));
console.log(`\nLongueur du texte visible : ${infos.longueurTexte} caractères.`);

const tables = await page.evaluate(() => {
  return [...document.querySelectorAll('table')].map((t, i) => ({
    index: i,
    headers: [...t.querySelectorAll('th')].map((th) => th.textContent.replace(/\s+/g, ' ').trim()),
    nbLignes: t.querySelectorAll('tbody tr').length,
    dixPremieresLignes: [...t.querySelectorAll('tbody tr')].slice(0, 10).map((tr) =>
      [...tr.querySelectorAll('td')].map((td) => td.textContent.replace(/\s+/g, ' ').trim())
    ),
  }));
});
console.log(`\n${tables.length} table(s) HTML trouvée(s) :`);
for (const t of tables) {
  console.log(`\n  Table #${t.index} — en-têtes : ${JSON.stringify(t.headers)}`);
  console.log(`  ${t.nbLignes} ligne(s). Aperçu :`, JSON.stringify(t.dixPremieresLignes, null, 2));
}

const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 6000));
console.log('\nExtrait du texte de la page (6000 premiers caractères) :\n', bodyText);

await browser.close();
