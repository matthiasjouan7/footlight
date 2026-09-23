// Diagnostic lecture seule : sync-transfermarkt-match-stats-n2.js ignore les
// 3 matchs joués d'Alençon (N2 groupe B, calendrier_officiel_id 671, 679,
// 695) avec le message "Compositions introuvables ou vides" (aucune
// <table> de la page avec >= 5 noms). L'utilisateur signale pourtant avoir
// vu 2 feuilles de match sur 3 disponibles en visitant directement
// transfermarkt.fr. Ce script rejoue exactement l'extraction du script de
// synchro (mêmes URLs, même sélecteur `table`, même seuil >=5) sur les 3
// matchs pour voir si les tables sont réellement vides ou si l'extraction
// (timing de chargement, bannière cookies, structure de page) est en
// cause.
import { chromium } from 'playwright';

const SAISON_ID_TM = '2026';
const WETTBEWERB = 'FR5B';
const NB_JOURNEES = 3;

const browser = await chromium.launch();
const page = await browser.newPage({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' });

// Repère les URLs des matchs sur les 3 premières journées EXACTEMENT comme
// le fait le script de synchro (sync-transfermarkt-match-stats-n2.js) :
// la page de journée ne donne que les liens spielbericht, pas les noms de
// club en clair — il faut visiter chaque page de match et lire son
// <title> pour connaître domicile/extérieur.
const toutesUrls = [];
for (let journee = 1; journee <= NB_JOURNEES; journee++) {
  const urlJournee = `https://www.transfermarkt.fr/national-2/spieltag/wettbewerb/${WETTBEWERB}/saison_id/${SAISON_ID_TM}/spieltag/${journee}`;
  await page.goto(urlJournee, { waitUntil: 'networkidle', timeout: 45000 });
  const hrefs = await page.evaluate(() => [...new Set([...document.querySelectorAll('a[href*="/spielbericht/index/spielbericht/"]')].map((a) => a.getAttribute('href')))]);
  console.log(`Journée ${journee} : ${hrefs.length} lien(s) de match trouvé(s).`);
  for (const href of hrefs) toutesUrls.push({ journee, url: `https://www.transfermarkt.fr${href}` });
}

const urlsAlencon = [];
for (const { journee, url } of toutesUrls) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
  const titre = await page.title();
  if (/alen[cç]on/i.test(titre)) urlsAlencon.push({ journee, url, titre });
}
console.log(`\n${urlsAlencon.length} match(s) Alençon identifié(s) sur ${NB_JOURNEES} journées (via <title>, comme le script de synchro).\n`);

for (const { journee, url, titre } of urlsAlencon) {
  console.log(`\n========== Journée ${journee} : ${url} ==========`);
  console.log(`<title> : "${titre}"`);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(500);

  // Bannière cookies (Sourcepoint/Didomi et cie) : si présente et jamais
  // fermée, elle peut recouvrir/retarder le rendu du contenu qui suit.
  const bandeauCookies = await page.evaluate(() => {
    const candidats = [...document.querySelectorAll('[id*="cookie" i], [class*="cookie" i], [id*="consent" i], [class*="consent" i]')];
    return candidats.filter((el) => el.offsetParent !== null).map((el) => (el.id || el.className || '').toString().slice(0, 80));
  });
  console.log(`Éléments cookies/consent visibles : ${bandeauCookies.length ? bandeauCookies.join(', ') : '(aucun)'}`);

  const tables = await page.evaluate(() => {
    return [...document.querySelectorAll('table')].map((t, i) => {
      const lignes = [...t.querySelectorAll('tr')].map((tr) => [...tr.querySelectorAll('td,th')].map((td) => (td.textContent || '').trim()));
      const noms = [];
      for (const l of lignes) {
        if (l.length === 2 && l[1] && !['Officielle', 'Probable'].includes(l[1]) && !['Manager', 'Entraîneur', 'Entraineur'].includes(l[0])) {
          for (const nom of l[1].split(',').map((s) => s.trim()).filter(Boolean)) noms.push(nom);
        }
      }
      return { index: i, nbLignes: lignes.length, nbNoms: noms.length, exempleNoms: noms.slice(0, 3), classe: t.className || null, id: t.id || null };
    });
  });
  console.log(`${tables.length} <table> trouvée(s) sur la page :`);
  for (const t of tables) console.log(`  table[${t.index}] class="${t.classe}" id="${t.id}" : ${t.nbLignes} ligne(s), ${t.nbNoms} nom(s) extrait(s) ${t.nbNoms ? '(ex: ' + t.exempleNoms.join(', ') + ')' : ''}`);
  const seuilAtteint = tables.some((t) => t.nbNoms >= 5);
  console.log(`Seuil >=5 noms atteint sur au moins une table : ${seuilAtteint ? 'OUI' : 'NON'} ${seuilAtteint ? '' : '(=> "Compositions introuvables ou vides" côté script de synchro)'}`);

  // Vérifie aussi la présence d'une mention explicite d'absence de feuille
  // de match (au cas où Transfermarkt affiche un message dédié).
  const texteAlerte = await page.evaluate(() => {
    const el = document.querySelector('.box-content, .sb-formation, .aufstellung');
    return el ? (el.textContent || '').trim().slice(0, 200) : null;
  });
  if (texteAlerte) console.log(`Extrait zone composition : "${texteAlerte}"`);
}

await browser.close();
