// Diagnostic lecture seule : vérifie sur le site en prod (footlight.fr)
// l'ordre réel des filtres affichés dans la barre latérale de
// footlight-recherche.html, pour confirmer si le déploiement Vercel a bien
// pris en compte le déplacement du filtre "Club" (PR #536, entre "Nom du
// joueur" et "Poste"). Exécuté depuis GitHub Actions car footlight.fr n'est
// pas joignable depuis l'environnement local de l'agent.
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('https://footlight.fr/footlight-recherche.html', { waitUntil: 'networkidle', timeout: 30000 });

const labels = await page.$$eval('.filter-label', (els) => els.map((e) => e.textContent.trim()));
console.log('Ordre des filtres :', labels.join(' | '));

const deployedAt = await page.evaluate(() => document.lastModified);
console.log('document.lastModified :', deployedAt);

await browser.close();
