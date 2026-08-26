// Diagnostic lecture seule : le rattrapage groupe A journée 1 traite 7 des
// 8 rencontres (jamais "US Pays du Valois vs Racing Club France" /
// "RACING CLUB FRANCE"), même schéma que Briochin. Récupère le texte brut
// scrapé pour ce match précis.
import * as cheerio from 'cheerio';

const url = 'https://www.lequipe.fr/Football/national-1-groupe-a/page-calendrier-resultats/1re-journee';
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
