// Lecture seule : récupère TOUTE la saison 2026-2027 de National 1 groupe C
// (cpNo=452036, phNo=1, gpNo=3, 17 équipes dont Union Foot Touraine, repêchée)
// depuis l'API JSON epreuves.fff.fr.
//
// Découvertes des diagnostics précédents :
// - L'API exige un en-tête "x-competition" (jeton opaque) sinon 403 — capturé
//   depuis une vraie requête Angular au chargement de la page.
// - Le fetch() doit passer par le moteur réseau de Chromium (page.evaluate),
//   pas Node nu ni page.request.get() — sinon 403 même avec le bon en-tête.
// - Une plage de dates couvrant toute la saison renvoie 503 (page de
//   maintenance FFF) même avec en-tête + Chromium — la plage doit rester
//   étroite. Pagine donc par tranches de 14 jours sur toute la saison.
import { chromium } from 'playwright';

const URL = 'https://epreuves.fff.fr/competition/engagement/2-n1/phase/1/3/resultats-et-calendrier';
const BASE = 'https://epreuves.fff.fr/api/data/matches?cpNo=452036&phNo=1&gpNo=3';

const DEBUT_SAISON = new Date('2026-07-01T00:00:00Z');
const FIN_SAISON = new Date('2027-06-30T00:00:00Z');
const JOURS_PAR_TRANCHE = 14;

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
console.log(`Jeton x-competition capturé : ${jeton}`);
if (!jeton) {
  console.log('Aucun jeton capturé, arrêt.');
  await browser.close();
  process.exit(1);
}

async function appelerApi(dateDebut, dateFin) {
  const url = `${BASE}&dateDebut=${encodeURIComponent(dateDebut.toISOString())}&dateFin=${encodeURIComponent(dateFin.toISOString())}&itemsPerPage=200&page=1&pagination=true`;
  return page.evaluate(async ({ u, xc }) => {
    try {
      const r = await fetch(u, { headers: { Accept: 'application/json, text/plain, */*', 'x-competition': xc } });
      const texte = await r.text();
      if (r.status !== 200) return { statut: r.status, erreur: texte.slice(0, 200) };
      const data = JSON.parse(texte);
      return { statut: 200, membres: data['hydra:member'] || [] };
    } catch (err) {
      return { statut: 0, erreur: String(err) };
    }
  }, { u: url, xc: jeton });
}

const matchsParId = new Map();
let curseur = new Date(DEBUT_SAISON);
let tranchesEchouees = 0;

while (curseur < FIN_SAISON) {
  const fin = new Date(Math.min(curseur.getTime() + JOURS_PAR_TRANCHE * 86400000, FIN_SAISON.getTime()));
  const resultat = await appelerApi(curseur, fin);
  const libelleTranche = `${curseur.toISOString().slice(0, 10)} -> ${fin.toISOString().slice(0, 10)}`;
  if (resultat.statut === 200) {
    for (const m of resultat.membres) {
      if (m.id) matchsParId.set(m.id, m);
    }
    console.log(`${libelleTranche} : OK (${resultat.membres.length} match(s))`);
  } else {
    tranchesEchouees++;
    console.log(`${libelleTranche} : ÉCHEC statut=${resultat.statut} — ${resultat.erreur?.slice(0, 150)}`);
  }
  curseur = fin;
  await page.waitForTimeout(300);
}

console.log(`\n=== Résumé ===`);
console.log(`Total matchs uniques récupérés : ${matchsParId.size}`);
console.log(`Tranches en échec : ${tranchesEchouees}`);

const matchs = [...matchsParId.values()];
const equipes = new Set();
for (const m of matchs) {
  const df = m.donneesFormatees || m;
  if (df.equipe1?.nom) equipes.add(df.equipe1.nom);
  if (df.equipe2?.nom) equipes.add(df.equipe2.nom);
}
console.log(`\nÉquipes distinctes trouvées (${equipes.size}) :`);
console.log([...equipes].sort().join('\n'));

console.log(`\nExemple de match brut (premier) :`);
console.log(JSON.stringify(matchs[0], null, 2).slice(0, 2500));

console.log(`\n"Touraine" présent dans les données : ${JSON.stringify(matchs).toLowerCase().includes('touraine')}`);

await browser.close();
