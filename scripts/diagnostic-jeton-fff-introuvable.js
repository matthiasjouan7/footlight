// Diagnostic lecture seule : sync-fff-match-stats-n2.js échoue depuis ce
// matin avec "Jeton x-competition introuvable, abandon." en ~2-4 secondes
// (alors que le dernier run réussi date d'hier 19h31) — trop rapide pour
// un vrai timeout réseau. Reproduit la navigation exacte du script de
// production (même URL, même waitUntil/timeout) mais journalise TOUTES
// les requêtes réseau, le statut HTTP final, le titre de page et un
// extrait du texte visible, pour comprendre pourquoi l'appel
// /api/data/matches (qui porte le header x-competition) ne se déclenche
// plus.
import { chromium } from 'playwright';

const GROUPE = process.env.GROUPE || 'B';
const GROUPES_LETTRE_VERS_GPNO = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8 };
const gpNo = GROUPES_LETTRE_VERS_GPNO[GROUPE];
if (!gpNo) { console.error(`Groupe invalide : ${GROUPE}`); process.exit(1); }

const url = `https://epreuves.fff.fr/competition/engagement/3-n2/phase/1/${gpNo}/resultats-et-calendrier`;
console.log(`Navigation vers : ${url}\n`);

const browser = await chromium.launch();
const page = await browser.newPage({ locale: 'fr-FR' });

const requetes = [];
page.on('request', (req) => {
  requetes.push({ url: req.url(), methode: req.method() });
});
page.on('response', (res) => {
  if (res.url() === url || res.url().includes('/api/data/')) {
    console.log(`Réponse : ${res.status()} ${res.url()}`);
  }
});
page.on('console', (msg) => console.log(`[console ${msg.type()}] ${msg.text()}`));
page.on('pageerror', (err) => console.log(`[pageerror] ${err.message}`));

let erreurNavigation = null;
const debut = Date.now();
try {
  const reponse = await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  console.log(`\nNavigation terminée en ${Date.now() - debut} ms.`);
  console.log(`Statut HTTP final : ${reponse ? reponse.status() : '(aucune réponse)'}`);
  console.log(`URL finale (après redirections éventuelles) : ${page.url()}`);
} catch (err) {
  erreurNavigation = err;
  console.log(`\nErreur de navigation après ${Date.now() - debut} ms : ${err.message}`);
}

await page.waitForTimeout(1000);

console.log(`\nTitre de page : "${await page.title()}"`);
const texte = await page.evaluate(() => document.body.innerText).catch(() => '(non lisible)');
console.log(`\nExtrait du texte visible (500 premiers caractères) :\n${texte.slice(0, 500)}`);

console.log(`\n${requetes.length} requête(s) réseau capturée(s) au total.`);
const requetesApi = requetes.filter((r) => r.url.includes('/api/'));
console.log(`Dont ${requetesApi.length} vers /api/ :`);
for (const r of requetesApi.slice(0, 20)) console.log(`  ${r.methode} ${r.url}`);
if (requetesApi.length === 0) {
  console.log('\nAucune requête /api/ détectée — liste des 20 premières requêtes toutes confondues :');
  for (const r of requetes.slice(0, 20)) console.log(`  ${r.methode} ${r.url}`);
}

await browser.close();
if (erreurNavigation) process.exit(1);
