// Découverte lecture seule (aucune écriture) : l'interception réseau
// précédente a trouvé l'API interne FFF pour lister des matchs :
// https://epreuves.fff.fr/api/data/matches?cpNo=452036&phNo=1&gpNo=3&dateDebut=...&dateFin=...
// (cpNo=452036/phNo=1/gpNo=3 correspondant à National 1 groupe C, l'URL
// /competition/engagement/2-n1/phase/1/3 visitée). Deux choses à vérifier :
// 1. Cette API est-elle appelable directement en fetch() simple, sans
//    piloter un navigateur complet (plus rapide, plus simple, pas de coût
//    Playwright/Chromium) ?
// 2. Quel est le cpNo/gpNo équivalent pour National 2 (poule 5, URL fournie
//    par l'utilisateur : /competition/engagement/3-n2/phase/1/5) ? On
//    visite cette page via Playwright en interceptant le réseau pour le
//    découvrir, comme pour National 1.
import { chromium } from 'playwright';

// ---- 1. Test d'appel direct (fetch simple, sans navigateur) ----
const URL_TEST_DIRECT = 'https://epreuves.fff.fr/api/data/matches?cpNo=452036&phNo=1&gpNo=3&dateDebut=2026-08-17T00:00:00%2B00:00&dateFin=2026-08-23T00:00:00%2B00:00&itemsPerPage=20&page=1&pagination=true';
console.log('=== Test 1 : appel direct fetch() simple (sans navigateur) ===');
try {
  const res = await fetch(URL_TEST_DIRECT, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
  });
  console.log(`Statut : ${res.status}`);
  const texte = await res.text();
  console.log(`Corps (2000 premiers caractères) :\n${texte.slice(0, 2000)}`);
} catch (e) {
  console.log(`Erreur : ${e.message}`);
}

// ---- 2. Découverte du cpNo/gpNo pour National 2 (poule fournie par l'utilisateur) ----
console.log('\n\n=== Test 2 : interception réseau sur la page National 2 poule 5 ===');
const URL_N2 = 'https://epreuves.fff.fr/competition/engagement/3-n2/phase/1/5/resultats-et-calendrier';

const browser = await chromium.launch();
const page = await browser.newPage({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  locale: 'fr-FR',
});

const requetesMatches = [];
page.on('response', async (response) => {
  const url = response.url();
  if (url.includes('/api/data/matches')) {
    let corps = null;
    try { corps = (await response.text()).slice(0, 3000); } catch (e) { /* ignore */ }
    requetesMatches.push({ url, statut: response.status(), corps });
  }
});

await page.goto(URL_N2, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(3000);

console.log(`${requetesMatches.length} requête(s) vers /api/data/matches capturée(s) :\n`);
for (const r of requetesMatches) {
  console.log(`[${r.statut}] ${r.url}`);
  if (r.corps) console.log(`  Corps : ${r.corps}\n`);
}

await browser.close();
