// Diagnostic lecture seule : le rattrapage groupe B journée 1 a traité 7
// des 8 rencontres de la page, mais jamais "Stade Briochin vs Vendée
// Poiré Football" (aucun log affiché pour ce match, alors que
// clubsCorrespondent() théoriquement matche selon les synonymes déjà
// ajoutés). Récupère le texte brut réellement scrapé pour ce match sur la
// page en direct de L'Équipe, pour voir s'il diffère de ce qui était
// supposé ("Saint-Brieuc" / "Le Poiré-sur-Vie").
import * as cheerio from 'cheerio';

const url = 'https://www.lequipe.fr/Football/national-1-groupe-b/page-calendrier-resultats/1re-journee';
const res = await fetch(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language': 'fr-FR,fr;q=0.9',
  },
});
if (!res.ok) { console.error(`Échec : statut ${res.status}`); process.exit(1); }
const html = await res.text();
const $ = cheerio.load(html);

$('.TeamScore').each((i, el) => {
  const $el = $(el);
  const home = $el.find('.TeamScore__team--home').first().text().trim() || null;
  const away = $el.find('.TeamScore__team').filter((j, t) => !$(t).hasClass('TeamScore__team--home')).first().text().trim() || null;
  console.log(`${i} | home="${home}" | away="${away}"`);
});
