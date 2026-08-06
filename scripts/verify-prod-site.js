// Vérifie que le site en prod (footlight.fr) se charge correctement : statut
// HTTP, absence d'erreurs JS console/page, absence de requêtes en échec, et
// présence des textes attendus sur les pages tarifs (utile après un déploiement
// pour confirmer que Vercel a bien pris en compte les derniers changements).
//
// Lecture seule — aucune écriture. Exécuté depuis GitHub Actions car
// footlight.fr n'est pas joignable depuis l'environnement local de l'agent.
import { chromium } from 'playwright';

const BASE = 'https://footlight.fr';

const PAGES = [
  {
    path: '/',
    mustContain: ['FootLight', '1 mois', '6 mois', '1 an', 'jours gratuits'],
    mustNotContain: ['1 à 3 mois', '4 à 6 mois', '6 mois et +', 'minimume'],
  },
  {
    path: '/footlight-paiement.html',
    mustContain: ['pk_live_'],
    mustNotContain: ['1 à 3 mois', '4 à 6 mois', '6 mois et +'],
  },
  { path: '/footlight-inscription-recruteur.html', mustContain: [], mustNotContain: [] },
  { path: '/footlight-inscription-joueur.html', mustContain: [], mustNotContain: [] },
  { path: '/footlight-espace.html', mustContain: [], mustNotContain: [] },
  { path: '/footlight-mentions-legales.html', mustContain: ['engagement 1 mois'], mustNotContain: [] },
  { path: '/footlight-suggestions.html', mustContain: [], mustNotContain: [] },
];

const browser = await chromium.launch();
let hadIssue = false;

for (const { path, mustContain, mustNotContain } of PAGES) {
  const url = BASE + path;
  const page = await browser.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  const badResponses = [];

  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', (err) => pageErrors.push(err.message));
  page.on('requestfailed', (req) => failedRequests.push(`${req.method()} ${req.url()} — ${req.failure()?.errorText}`));
  page.on('response', (r) => { if (r.status() >= 400) badResponses.push(`${r.status()} ${r.url()}`); });

  console.log(`\n=== ${url} ===`);
  try {
    const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    const status = resp?.status();
    console.log(`Statut HTTP : ${status}`);
    if (status !== 200) hadIssue = true;

    await page.waitForTimeout(1000);
    const content = await page.content();

    for (const needle of mustContain) {
      if (!content.includes(needle)) {
        console.log(`  MANQUANT attendu : "${needle}"`);
        hadIssue = true;
      }
    }
    for (const needle of mustNotContain) {
      if (content.includes(needle)) {
        console.log(`  PRÉSENT alors qu'il ne devrait pas l'être : "${needle}"`);
        hadIssue = true;
      }
    }

    if (consoleErrors.length) { hadIssue = true; console.log('Erreurs console :'); consoleErrors.forEach((e) => console.log('  - ' + e)); }
    if (pageErrors.length) { hadIssue = true; console.log('Exceptions JS non interceptées :'); pageErrors.forEach((e) => console.log('  - ' + e)); }
    if (failedRequests.length) { hadIssue = true; console.log('Requêtes échouées :'); failedRequests.forEach((e) => console.log('  - ' + e)); }
    if (badResponses.length) { hadIssue = true; console.log('Réponses HTTP >= 400 :'); badResponses.forEach((e) => console.log('  - ' + e)); }

    if (!consoleErrors.length && !pageErrors.length && !failedRequests.length && !badResponses.length) {
      console.log('OK — aucune erreur détectée.');
    }
  } catch (e) {
    hadIssue = true;
    console.log(`ÉCHEC DE CHARGEMENT : ${e.message}`);
  }
  await page.close();
}

await browser.close();
console.log(`\nRésumé : ${hadIssue ? 'AU MOINS UN PROBLÈME DÉTECTÉ' : 'TOUT EST OK'}`);
process.exit(hadIssue ? 1 : 0);
