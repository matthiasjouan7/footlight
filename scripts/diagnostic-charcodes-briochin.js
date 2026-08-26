import * as cheerio from 'cheerio';

const url = 'https://www.lequipe.fr/Football/national-1-groupe-b/page-calendrier-resultats/1re-journee';
const res = await fetch(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language': 'fr-FR,fr;q=0.9',
  },
});
const html = await res.text();
const $ = cheerio.load(html);

$('.TeamScore').each((i, el) => {
  const $el = $(el);
  const home = $el.find('.TeamScore__team--home').first().text().trim() || '';
  const away = $el.find('.TeamScore__team').filter((j, t) => !$(t).hasClass('TeamScore__team--home')).first().text().trim() || '';
  if (home.toLowerCase().includes('brieuc') || away.toLowerCase().includes('poir')) {
    console.log(`home="${home}"`);
    console.log('  codes:', [...home].map((c) => c.codePointAt(0).toString(16)).join(' '));
    console.log(`away="${away}"`);
    console.log('  codes:', [...away].map((c) => c.codePointAt(0).toString(16)).join(' '));
  }
});
