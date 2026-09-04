// Diagnostic lecture seule : le scraping automatisé d'epreuves.fff.fr
// échoue depuis 2 jours ("APPLICATION MOMENTANÉMENT INDISPONIBLE", 403)
// sur la page calendrier N2. Teste plusieurs URLs FFF différentes (page
// d'accueil du site, une autre compétition/groupe, le domaine www.fff.fr)
// pour déterminer si le blocage touche tout FFF, seulement
// epreuves.fff.fr, ou seulement cette page de compétition précise —
// distinction utile pour savoir si une vraie panne globale ou un blocage
// ciblé est en cause. Aucune tentative de contournement (pas de proxy,
// pas d'usurpation d'empreinte au-delà d'un user-agent standard).
import { chromium } from 'playwright';

const URLS_A_TESTER = [
  'https://www.fff.fr/',
  'https://epreuves.fff.fr/',
  'https://epreuves.fff.fr/competition/engagement/3-n2/phase/1/1/resultats-et-calendrier',
  'https://epreuves.fff.fr/competition/engagement/2-national/phase/1/1/resultats-et-calendrier',
];

const browser = await chromium.launch();
for (const url of URLS_A_TESTER) {
  const page = await browser.newPage({ locale: 'fr-FR', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36' });
  console.log(`\n########## ${url} ##########`);
  try {
    const reponse = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log(`Statut HTTP : ${reponse ? reponse.status() : '(aucune réponse)'}`);
    console.log(`Titre : "${await page.title()}"`);
    const texte = await page.evaluate(() => document.body.innerText).catch(() => '');
    console.log(`Extrait (300 premiers caractères) : ${texte.slice(0, 300).replace(/\n+/g, ' | ')}`);
  } catch (err) {
    console.log(`Erreur de navigation : ${err.message}`);
  }
  await page.close();
}
await browser.close();
