// Découverte lecture seule (aucune écriture) : epreuves.fff.fr est une
// application JS (Angular/Ionic, éléments "app-input-N") qui charge
// probablement ses données de compétition/calendrier via une API interne
// plutôt que des liens classiques — la page compétition
// (engagement/2-n1/phase/1/3/accueil) ne montre que la journée courante
// sans URL distincte par journée, et son sélecteur de poule est limité à
// National 1. Intercepte toutes les requêtes réseau (XHR/fetch) pendant le
// chargement de la page pour repérer l'endpoint API sous-jacent — bien
// plus robuste qu'analyser le DOM si on veut ensuite appeler cette API
// directement pour n'importe quelle poule/journée (National 2 y compris).
import { chromium } from 'playwright';

const URL_COMPETITION = 'https://epreuves.fff.fr/competition/engagement/2-n1/phase/1/3';

const browser = await chromium.launch();
const page = await browser.newPage({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  locale: 'fr-FR',
});

const requetesApi = [];
page.on('response', async (response) => {
  const url = response.url();
  const type = response.request().resourceType();
  if (type === 'xhr' || type === 'fetch' || /\/api\/|\.json/i.test(url)) {
    let extrait = null;
    try {
      const contentType = response.headers()['content-type'] || '';
      if (contentType.includes('json')) {
        const texte = await response.text();
        extrait = texte.slice(0, 500);
      }
    } catch (e) { /* ignore */ }
    requetesApi.push({ url, statut: response.status(), type, extrait });
  }
});

await page.goto(URL_COMPETITION, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(3000);

console.log(`${requetesApi.length} requête(s) API (xhr/fetch/json) capturée(s) pendant le chargement :\n`);
for (const r of requetesApi) {
  console.log(`[${r.statut}] ${r.type} ${r.url}`);
  if (r.extrait) console.log(`  Extrait : ${r.extrait.replace(/\n/g, ' ')}\n`);
}

// Essaie aussi de cliquer sur l'onglet "Résultats / calendrier" pour voir
// si ça déclenche de nouvelles requêtes (le lien avait href=null, donc
// probablement un composant JS plutôt qu'une vraie navigation).
try {
  await page.click('text=Résultats / calendrier', { timeout: 5000 });
  await page.waitForTimeout(2000);
  console.log(`\nAprès clic sur "Résultats / calendrier" : ${requetesApi.length} requête(s) API au total.`);
} catch (e) {
  console.log(`\nClic sur "Résultats / calendrier" impossible : ${e.message}`);
}

await browser.close();
