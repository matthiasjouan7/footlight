// Diagnostic lecture seule : inspecte le contenu retourné par l'endpoint
// AJAX d'un événement Transfermarkt (data-content="/ajax/ereignis/
// spielbericht/<id>" trouvé sur chaque icône de la timeline
// .sb-zeitleiste-ereignisse). Objectif : voir si ce fragment contient la
// minute exacte en texte clair (pas de sprite CSS ici, contrairement à
// l'icône elle-même), ce qui permettrait de compléter les données déjà
// complètes de Transfermarkt (contrairement aux trous éditoriaux de
// footmercato) avec la minute précise.
import { chromium } from 'playwright';

const URL_MATCH = process.env.URL_MATCH || 'https://www.transfermarkt.fr/spielbericht/index/spielbericht/4967173';

const browser = await chromium.launch();
const page = await browser.newPage({ locale: 'fr-FR', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36' });

await page.goto(URL_MATCH, { waitUntil: 'networkidle', timeout: 45000 });
console.log(`Titre : "${await page.title()}"\n`);

const idsEvenements = await page.evaluate(() => {
  return [...document.querySelectorAll('.sb-leiste-ereignis')].map((el) => ({
    style: el.getAttribute('style'),
    content: el.getAttribute('data-content'),
  }));
});
console.log(`${idsEvenements.length} événement(s) trouvé(s) sur la timeline.\n`);

// Teste les 3 premiers pour voir le format de réponse.
for (const ev of idsEvenements.slice(0, 3)) {
  if (!ev.content) continue;
  const url = ev.content.startsWith('http') ? ev.content : `https://www.transfermarkt.fr${ev.content}`;
  console.log(`########## ${url} (style="${ev.style}") ##########`);
  const resultat = await page.evaluate(async (u) => {
    try {
      const r = await fetch(u, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
      const texte = await r.text();
      return { statut: r.status, texte };
    } catch (err) {
      return { statut: 0, erreur: String(err) };
    }
  }, url);
  console.log(`Statut : ${resultat.statut}`);
  console.log(`Contenu (1500 premiers caractères) :\n${(resultat.texte || resultat.erreur || '').slice(0, 1500)}\n`);
}

await browser.close();
