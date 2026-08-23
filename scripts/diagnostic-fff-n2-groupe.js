// Diagnostic lecture seule : Union Foot Touraine repêchée en National 1
// laisse un "exempt" (bye) dans son ancien groupe National 2 (signalé par
// l'utilisateur : https://epreuves.fff.fr/competition/engagement/3-n2/
// phase/1/8/resultats-et-calendrier). Capture cpNo/phNo/gpNo de cette page
// (comme pour National 1 groupe C) et dump la liste des équipes + la
// présence éventuelle de Touraine dans les données FFF, pour évaluer si
// notre calendrier_officiel N2 a besoin du même type de correction.
import { chromium } from 'playwright';

const URL_PAGE = 'https://epreuves.fff.fr/competition/engagement/3-n2/phase/1/8/resultats-et-calendrier';

const browser = await chromium.launch(process.env.PW_EXECUTABLE_PATH ? { executablePath: process.env.PW_EXECUTABLE_PATH } : {});
const page = await browser.newPage();

let jeton = null;
let cpNo = null, phNo = null, gpNo = null;
page.on('request', (req) => {
  const url = req.url();
  if (url.includes('/api/data/matches')) {
    if (!jeton) jeton = req.headers()['x-competition'] || null;
    const u = new URL(url);
    cpNo = cpNo || u.searchParams.get('cpNo');
    phNo = phNo || u.searchParams.get('phNo');
    gpNo = gpNo || u.searchParams.get('gpNo');
  }
});
await page.goto(URL_PAGE, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1500);

console.log(`cpNo=${cpNo} phNo=${phNo} gpNo=${gpNo}`);
console.log(`Jeton x-competition : ${jeton}`);

if (!jeton || !cpNo) { console.error('Paramètres introuvables, abandon.'); await browser.close(); process.exit(1); }

const BASE_API = `https://epreuves.fff.fr/api/data/matches?cpNo=${cpNo}&phNo=${phNo}&gpNo=${gpNo}`;
async function appelerApi(dateDebut, dateFin) {
  const url = `${BASE_API}&dateDebut=${encodeURIComponent(dateDebut)}&dateFin=${encodeURIComponent(dateFin)}&itemsPerPage=200&page=1&pagination=true`;
  return page.evaluate(async ({ u, xc }) => {
    const r = await fetch(u, { headers: { Accept: 'application/json, text/plain, */*', 'x-competition': xc } });
    const texte = await r.text();
    if (r.status !== 200) return { statut: r.status, erreur: texte.slice(0, 300) };
    return { statut: 200, membres: JSON.parse(texte)['hydra:member'] || [] };
  }, { u: url, xc: jeton });
}

// Une seule tranche de 2 semaines (journée 1) suffit pour voir la
// structure du groupe (équipes, éventuel exempt) sans déclencher le 503.
const resultat = await appelerApi('2026-08-15T00:00:00+00:00', '2026-08-29T00:00:00+00:00');
console.log(`\nStatut : ${resultat.statut}`);
if (resultat.statut !== 200) {
  console.log(resultat.erreur);
  await browser.close();
  process.exit(1);
}
console.log(`Matchs trouvés (journée 1 environ) : ${resultat.membres.length}`);

const equipes = new Set();
for (const m of resultat.membres) {
  const df = m.donneesFormatees;
  if (df?.recevant?.club?.nom) equipes.add(df.recevant.club.nom);
  if (df?.visiteur?.club?.nom) equipes.add(df.visiteur.club.nom);
  console.log(`  ${df?.date} — ${df?.recevant?.club?.nom} vs ${df?.visiteur?.club?.nom}`);
}
console.log(`\nÉquipes vues (${equipes.size}) : ${[...equipes].sort().join(', ')}`);
console.log(`\n"Touraine" présent dans les données FFF (journée 1) : ${[...equipes].some((e) => /touraine/i.test(e))}`);

// Dump la liste complète des équipes du groupe (via les métadonnées de
// compétition partagées, comme pour groupe C National 1).
const premierMatch = resultat.membres[0];
const groupes = premierMatch?.donneesFormatees?.competition?.donneesFormatees?.phases?.[0]?.groupes || [];
const ceGroupe = groupes.find((g) => g.gpNo === gpNo);
console.log(`\nNom du groupe (FFF) : ${ceGroupe?.nom}`);
console.log(`Nombre de journées connues : ${ceGroupe?.journees?.length}`);

await browser.close();
