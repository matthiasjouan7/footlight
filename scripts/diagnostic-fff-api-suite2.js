// Diagnostic lecture seule : suite de diagnostic-fff-api-suite.js.
// Les hypothèses A (fetch nu, plage étroite) ET B (page.request.get depuis
// le contexte navigateur, plage large) ont toutes deux échoué en 403 —
// page.request.get() n'est PAS un vrai fetch() exécuté par le moteur JS de
// la page (pas de Origin/Referer identiques à ceux qu'Angular enverrait,
// possible protection anti-bot sur l'empreinte TLS/JS).
// Hypothèse C : exécuter le fetch() DANS le contexte JS de la page via
// page.evaluate, pour qu'il soit indiscernable d'un appel natif d'Angular
// (même origine, mêmes en-têtes automatiques, même moteur JS/TLS).
import { chromium } from 'playwright';

const BASE = 'https://epreuves.fff.fr/api/data/matches?cpNo=452036&phNo=1&gpNo=3';

const browser = await chromium.launch(process.env.PW_EXECUTABLE_PATH ? { executablePath: process.env.PW_EXECUTABLE_PATH } : {});
const page = await browser.newPage();
await page.goto('https://epreuves.fff.fr/competition/engagement/2-n1/phase/1/3/resultats-et-calendrier', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1000);

async function testerDepuisPage(label, url) {
  console.log(`\n=== ${label} ===`);
  const resultat = await page.evaluate(async (u) => {
    try {
      const r = await fetch(u, { headers: { Accept: 'application/json' } });
      const texte = await r.text();
      return { statut: r.status, taille: texte.length, apercu: texte.slice(0, 1500) };
    } catch (err) {
      return { erreur: String(err) };
    }
  }, url);
  console.log(JSON.stringify(resultat, null, 2).slice(0, 2000));
  return resultat;
}

// Plage étroite (1 semaine), comme un vrai fetch natif de la page.
await testerDepuisPage(
  'Hypothèse C1 : fetch() natif page.evaluate, plage étroite',
  `${BASE}&dateDebut=2026-08-22T00:00:00%2B00:00&dateFin=2026-08-29T00:00:00%2B00:00&itemsPerPage=200&page=1&pagination=true`
);

// Plage large (saison complète).
await testerDepuisPage(
  'Hypothèse C2 : fetch() natif page.evaluate, plage large (saison complète)',
  `${BASE}&dateDebut=2026-07-01T00:00:00%2B00:00&dateFin=2027-06-30T00:00:00%2B00:00&itemsPerPage=200&page=1&pagination=true`
);

await browser.close();
