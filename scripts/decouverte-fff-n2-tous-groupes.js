// Découverte lecture seule (aucune écriture) : avant de construire une
// synchro stats FFF pour National 2 (8 groupes), il faut connaître le
// cpNo/phNo/gpNo de CHAQUE groupe A-H (diagnostic-fff-n2-groupe.js n'a
// vérifié qu'un seul slot d'URL numérique, avec l'hypothèse non confirmée
// "1=A, 2=B, ... 8=H"). Visite les 8 URLs numériques (slots 1 à 8) de
// engagement/3-n2/phase/1/<N>/resultats-et-calendrier et capture pour
// chacune : cpNo/phNo/gpNo réels, jeton x-competition, et le nom du
// groupe tel qu'affiché par FFF (ceGroupe.nom) pour fiabiliser le mapping
// slot -> lettre A-H plutôt que de le supposer.
import { chromium } from 'playwright';

const browser = await chromium.launch(process.env.PW_EXECUTABLE_PATH ? { executablePath: process.env.PW_EXECUTABLE_PATH } : {});

const resultats = [];
for (let slot = 1; slot <= 8; slot++) {
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
  const urlPage = `https://epreuves.fff.fr/competition/engagement/3-n2/phase/1/${slot}/resultats-et-calendrier`;
  try {
    await page.goto(urlPage, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(1200);
  } catch (e) {
    console.log(`Slot ${slot} : erreur navigation — ${e.message}`);
    await page.close();
    continue;
  }

  let nomGroupe = null;
  if (jeton && cpNo) {
    try {
      const apiUrl = `https://epreuves.fff.fr/api/data/matches?cpNo=${cpNo}&phNo=${phNo}&gpNo=${gpNo}&dateDebut=${encodeURIComponent('2026-08-15T00:00:00+00:00')}&dateFin=${encodeURIComponent('2026-08-29T00:00:00+00:00')}&itemsPerPage=200&page=1&pagination=true`;
      const resultat = await page.evaluate(async ({ u, xc }) => {
        const r = await fetch(u, { headers: { Accept: 'application/json, text/plain, */*', 'x-competition': xc } });
        const texte = await r.text();
        if (r.status !== 200) return { statut: r.status, erreur: texte.slice(0, 200) };
        return { statut: 200, membres: JSON.parse(texte)['hydra:member'] || [] };
      }, { u: apiUrl, xc: jeton });
      if (resultat.statut === 200 && resultat.membres.length) {
        const groupes = resultat.membres[0]?.donneesFormatees?.competition?.donneesFormatees?.phases?.[0]?.groupes || [];
        const ceGroupe = groupes.find((g) => g.gpNo === gpNo);
        nomGroupe = ceGroupe?.nom || null;
      }
    } catch (e) { /* ignore */ }
  }

  console.log(`Slot ${slot} : cpNo=${cpNo} phNo=${phNo} gpNo=${gpNo} nomGroupe=${JSON.stringify(nomGroupe)} jeton=${jeton ? 'ok' : 'MANQUANT'}`);
  resultats.push({ slot, cpNo, phNo, gpNo, nomGroupe });
  await page.close();
}

await browser.close();
console.log('\nRésumé JSON :', JSON.stringify(resultats));
