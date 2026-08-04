// Inspection (lecture seule) d'une page match-direct de lequipe.fr, via un
// vrai navigateur : la page sert ses données dans un objet JS obfusqué
// (window.__fetch__ = (function(a,b,c,...){ ... })(...)) que le HTML brut
// ne permet pas de lire fiablement (les valeurs sont indirectées par des
// lettres). En laissant Chromium exécuter le JS, on récupère l'objet déjà
// résolu.
import { chromium } from 'playwright';

const targetUrl = process.env.TARGET_URL;
if (!targetUrl) {
  console.error('TARGET_URL manquant.');
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage();

// window.__fetch__ (et probablement __stores__) sont réassignés plusieurs
// fois pendant le chargement/l'hydratation (un widget de menu générique
// écrase la valeur d'origine) : on intercepte TOUTES les assignations dès
// le tout début du chargement, avant que le JS de la page ne s'exécute.
await page.addInitScript(() => {
  const specs = [
    { prop: '__fetch__', historyKey: '__fetchHistory__' },
    { prop: '__stores__', historyKey: '__storesHistory__' },
  ];
  for (const { prop, historyKey } of specs) {
    let current;
    const history = [];
    window[historyKey] = history;
    Object.defineProperty(window, prop, {
      configurable: true,
      get() { return current; },
      set(v) { current = v; history.push(v); },
    });
  }
});

await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 60000 });

const result = await page.evaluate(() => {
  function walk(obj, seen, typeSamples, keyHits, depth) {
    if (obj === null || typeof obj !== 'object' || depth > 12) return;
    if (seen.has(obj)) return;
    seen.add(obj);
    if (Array.isArray(obj)) {
      for (const item of obj) walk(item, seen, typeSamples, keyHits, depth + 1);
      return;
    }
    if (obj.__type && !typeSamples[obj.__type]) {
      try { typeSamples[obj.__type] = JSON.stringify(obj).slice(0, 700); } catch (e) {}
    }
    for (const k of Object.keys(obj)) {
      if (/but|score|resultat|temps_fort|evenement|commentaire|fait/i.test(k) && !(k in keyHits)) {
        try { keyHits[k] = JSON.stringify(obj[k]).slice(0, 700); } catch (e) { keyHits[k] = String(obj[k]); }
      }
      walk(obj[k], seen, typeSamples, keyHits, depth + 1);
    }
  }

  const typeSamples = {};
  const keyHits = {};
  const seen = new Set();
  const fetchHistory = window.__fetchHistory__ || [];
  const storesHistory = window.__storesHistory__ || [];
  for (const v of [...fetchHistory, ...storesHistory]) {
    walk(v, seen, typeSamples, keyHits, 0);
  }
  return {
    availableGlobals: Object.keys(window).filter((k) => k.startsWith('__')),
    fetchAssignments: fetchHistory.length,
    storesAssignments: storesHistory.length,
    typeSamples,
    keyHits,
  };
});

console.log('Globals __* trouvés sur window :', result.availableGlobals.join(', '));
console.log(`Assignations capturées : __fetch__ x${result.fetchAssignments}, __stores__ x${result.storesAssignments}`);
console.log('\n=== Types (__type) rencontrés dans les données ===');
for (const [type, sample] of Object.entries(result.typeSamples)) {
  console.log(`\n--- __type: ${type} ---`);
  console.log(sample);
}
console.log('\n=== Clés correspondant à but/score/résultat/etc. ===');
for (const [key, value] of Object.entries(result.keyHits)) {
  console.log(`\n--- clé: ${key} ---`);
  console.log(value);
}

await browser.close();
