// Découverte lecture seule (aucune écriture) : avant de construire une
// synchro stats généralisée à toutes les divisions (N1/N2/Ligue 3) via
// l'API FFF, vérifie si l'API fournit la composition et le fil du match
// (buts/cartons/changements avec minute) en JSON structuré — ce qui
// éviterait d'avoir à extraire ces informations du texte visible de la
// page comme fait manuellement pour Hyères/Limonest
// (corrige-stats-hyeres-limonest-j1-fff.js).
//
// Charge la page du match connu (Hyères/Limonest) via Playwright — pour
// obtenir un cookie de session valide, l'appel direct fetch() ayant fini
// par être bloqué (403) — et intercepte toute requête vers
// /api/matches/56635087 ou similaire.
import { chromium } from 'playwright';

const URL_MATCH = 'https://epreuves.fff.fr/competition/match/56635087-hyeres-f-c-football-club-limonest-dardilly-saint-didier/match';

const browser = await chromium.launch();
const page = await browser.newPage({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  locale: 'fr-FR',
});

const requetesMatch = [];
page.on('response', async (response) => {
  const url = response.url();
  if (/\/api\/(data\/)?matches?/i.test(url)) {
    let corps = null;
    try {
      const ct = response.headers()['content-type'] || '';
      if (ct.includes('json')) corps = await response.text();
    } catch (e) { /* ignore */ }
    requetesMatch.push({ url, statut: response.status(), corps });
  }
});

await page.goto(URL_MATCH, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(3000);

console.log(`${requetesMatch.length} requête(s) matches capturée(s) sur la page du match :\n`);
for (const r of requetesMatch) {
  console.log(`[${r.statut}] ${r.url}`);
  if (r.corps) console.log(`  Corps (3000 premiers caractères) :\n  ${r.corps.slice(0, 3000)}\n`);
}

// Essaie aussi explicitement l'endpoint de détail d'un match par id, dans
// le même contexte de session (cookies déjà établis par la navigation).
console.log('\n--- Essai explicite /api/matches/56635087 dans le contexte de session ---');
const resDetail = await page.evaluate(async () => {
  const r = await fetch('/api/matches/56635087', { headers: { Accept: 'application/json' } });
  return { statut: r.status, corps: (await r.text()).slice(0, 5000) };
});
console.log(`Statut : ${resDetail.statut}`);
console.log(resDetail.corps);

await browser.close();
