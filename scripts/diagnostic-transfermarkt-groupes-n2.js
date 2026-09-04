// Diagnostic lecture seule : sync-transfermarkt-match-stats-n2.js trouve
// 0 match pour les groupes N2 B et F (alors que A, C, D, E, G, H
// fonctionnent). Vérifie pour chaque groupe A-H le titre réel de la page
// spieltag journée 1 (FR5<lettre>) pour savoir si le code wettbewerb
// correspond à une vraie compétition National 2, ou à autre chose /
// une page vide.
import { chromium } from 'playwright';

const SAISON_ID_TM = '2026';
const browser = await chromium.launch();
const page = await browser.newPage({ locale: 'fr-FR', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36' });

for (const lettre of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']) {
  const wettbewerb = `FR5${lettre}`;
  const url = `https://www.transfermarkt.fr/national-2/spieltag/wettbewerb/${wettbewerb}/saison_id/${SAISON_ID_TM}/spieltag/1`;
  console.log(`\n########## Groupe ${lettre} (${wettbewerb}) ##########`);
  try {
    const reponse = await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
    console.log(`Statut HTTP : ${reponse ? reponse.status() : '(aucune réponse)'}`);
    console.log(`Titre : "${await page.title()}"`);
    const nbLiens = await page.evaluate(() => document.querySelectorAll('a[href*="/spielbericht/index/spielbericht/"]').length);
    console.log(`Liens de match trouvés : ${nbLiens}`);
    const texte = await page.evaluate(() => document.body.innerText).catch(() => '');
    console.log(`Extrait (200 premiers caractères) : ${texte.slice(0, 200).replace(/\n+/g, ' | ')}`);
  } catch (err) {
    console.log(`Erreur de navigation : ${err.message}`);
  }
  await page.waitForTimeout(300);
}
await browser.close();
