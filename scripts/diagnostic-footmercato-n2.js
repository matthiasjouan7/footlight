// Diagnostic lecture seule : teste footmercato.net comme source
// alternative pour National 2, proposée par l'utilisateur en réponse au
// constat que Transfermarkt encode les minutes de but/carton/remplacement
// via un sprite CSS (background-position) plutôt qu'en texte, ce qui
// nécessiterait ~15 requêtes AJAX supplémentaires par match. Vérifie si
// footmercato.net est accessible depuis GitHub Actions, examine la page
// calendrier d'une journée, puis une page de détail de match pour voir si
// les minutes y sont du texte brut directement exploitable.
import { chromium } from 'playwright';

const URL_CALENDRIER = process.env.URL_CALENDRIER || 'https://www.footmercato.net/france/national-2/calendrier/8365150612397432064-journee-1';
// Si défini, saute la découverte via le calendrier et teste directement
// cette page de match (ex: le vrai match Cesson/Nancy II qu'on cherche à
// corriger : https://www.footmercato.net/live/367772023900331232-ocpam-vs-nancy-ii).
const URL_MATCH_DIRECT = process.env.URL_MATCH_DIRECT || '';

const browser = await chromium.launch();
const page = await browser.newPage({ locale: 'fr-FR', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36' });

let liensMatch = [];
if (!URL_MATCH_DIRECT) {
  console.log(`Navigation vers : ${URL_CALENDRIER}\n`);
  let statut = null;
  try {
    const reponse = await page.goto(URL_CALENDRIER, { waitUntil: 'networkidle', timeout: 45000 });
    statut = reponse ? reponse.status() : null;
    console.log(`Statut HTTP : ${statut}`);
  } catch (err) {
    console.log(`Erreur de navigation : ${err.message}`);
    await browser.close();
    process.exit(1);
  }
  console.log(`Titre de page : "${await page.title()}"`);

  const texteVisible = await page.evaluate(() => document.body.innerText).catch(() => '');
  console.log(`\nExtrait innerText (1200 premiers caractères) :\n${texteVisible.slice(0, 1200)}`);

  liensMatch = await page.evaluate(() => {
    // Un vrai lien de match a un slug après l'ID ("/live/<id>-<equipe1>-vs-<equipe2>"),
    // contrairement au lien générique "/live/" (page d'accueil du livescore).
    const liens = [...document.querySelectorAll('a[href*="/live/"]')].filter((a) => /\/live\/\d+-.+/.test(a.getAttribute('href') || ''));
    const uniques = new Map();
    for (const a of liens) uniques.set(a.getAttribute('href'), (a.textContent || '').trim());
    return [...uniques.entries()];
  });
  console.log(`\n${liensMatch.length} lien(s) potentiel(s) de match trouvé(s) :`);
  for (const [href, texte] of liensMatch.slice(0, 20)) console.log(`  ${href}  ("${texte}")`);
}

if (URL_MATCH_DIRECT || liensMatch.length > 0) {
  const urlMatch = URL_MATCH_DIRECT || (liensMatch[0][0].startsWith('http') ? liensMatch[0][0] : `https://www.footmercato.net${liensMatch[0][0]}`);
  console.log(`\n########## Test de la page de match : ${urlMatch} ##########`);
  await page.goto(urlMatch, { waitUntil: 'networkidle', timeout: 45000 });
  console.log(`Titre : "${await page.title()}"`);
  const texteMatch = await page.evaluate(() => document.body.innerText).catch(() => '');
  console.log(`\nLongueur innerText page match : ${texteMatch.length} caractères.`);
  console.log(`\nExtrait innerText de la page match (5000 premiers caractères) :\n${texteMatch.slice(0, 5000)}`);

  const tables = await page.evaluate(() => {
    return [...document.querySelectorAll('table')].map((t, i) => ({
      index: i,
      classe: t.className,
      lignes: [...t.querySelectorAll('tr')].slice(0, 20).map((tr) =>
        [...tr.querySelectorAll('td,th')].map((td) => (td.textContent || '').trim().replace(/\s+/g, ' '))
      ),
    }));
  });
  console.log(`\n${tables.length} table(s) HTML trouvée(s) sur la page match.`);
  for (const t of tables) {
    console.log(`--- Table #${t.index} (class="${t.classe}") ---`);
    for (const ligne of t.lignes) console.log(`  [${ligne.join(' | ')}]`);
  }
}

await browser.close();
