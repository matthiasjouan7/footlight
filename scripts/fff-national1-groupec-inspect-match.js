// Diagnostic lecture seule : fff-national1-groupec-fetch-saison.js a
// récupéré 306 matchs mais mon extraction équipe1/équipe2 était fausse (0
// équipe trouvée) — le JSON dumpé montre une structure imbriquée avec des
// métadonnées de compétition/phase/groupes, pas evident où se trouvent les
// noms d'équipes du match lui-même. Isole UN SEUL match de la journée 1
// (22/08, déjà jouée) et dump sa structure complète sans troncature pour
// repérer les bons champs (équipes, score, date, journée, groupe).
import { chromium } from 'playwright';

const URL = 'https://epreuves.fff.fr/competition/engagement/2-n1/phase/1/3/resultats-et-calendrier';
const BASE = 'https://epreuves.fff.fr/api/data/matches?cpNo=452036&phNo=1&gpNo=3';

const browser = await chromium.launch(process.env.PW_EXECUTABLE_PATH ? { executablePath: process.env.PW_EXECUTABLE_PATH } : {});
const page = await browser.newPage();

let jeton = null;
page.on('request', (req) => {
  if (req.url().includes('/api/data/matches') && !jeton) {
    jeton = req.headers()['x-competition'] || null;
  }
});

await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1000);

const url = `${BASE}&dateDebut=${encodeURIComponent('2026-08-22T00:00:00Z')}&dateFin=${encodeURIComponent('2026-08-23T00:00:00Z')}&itemsPerPage=20&page=1&pagination=true`;
const resultat = await page.evaluate(async ({ u, xc }) => {
  const r = await fetch(u, { headers: { Accept: 'application/json, text/plain, */*', 'x-competition': xc } });
  return { statut: r.status, texte: await r.text() };
}, { u: url, xc: jeton });

console.log(`Statut : ${resultat.statut}`);
const data = JSON.parse(resultat.texte);
const membres = data['hydra:member'] || [];
console.log(`Nombre de matchs journée 1 (22/08) : ${membres.length}`);

console.log('\n=== Clés de premier niveau du 1er match ===');
console.log(Object.keys(membres[0]));

console.log('\n=== Clés de donneesFormatees ===');
console.log(Object.keys(membres[0].donneesFormatees || {}));

console.log('\n=== JSON complet du 1er match (SANS troncature) ===');
console.log(JSON.stringify(membres[0]));

await browser.close();
