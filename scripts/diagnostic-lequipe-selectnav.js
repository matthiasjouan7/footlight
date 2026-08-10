// Diagnostic (lecture seule, pas d'écriture) : inspecte le sélecteur de
// journée (.SelectNav) sur une page calendrier-resultats de lequipe.fr, pour
// voir s'il est possible de naviguer vers une journée passée (autre que
// celle affichée par défaut) — utile pour un futur rattrapage des stats
// d'un joueur ajouté après plusieurs journées déjà jouées.
import * as cheerio from 'cheerio';

const targetUrl = process.env.TARGET_URL || 'https://www.lequipe.fr/Football/ligue-3/page-calendrier-resultats';

const res = await fetch(targetUrl, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language': 'fr-FR,fr;q=0.9',
  },
});
console.log(`Statut : ${res.status}`);
const html = await res.text();
const $ = cheerio.load(html);

console.log(`\n--- .SelectNav (structure complète) ---`);
$('.SelectNav').each((i, el) => {
  console.log($.html(el));
});

console.log(`\n--- Tous les <a> et <option> contenant "journee" ou "journée" dans href/value/texte ---`);
$('a, option').each((i, el) => {
  const $el = $(el);
  const href = $el.attr('href') || '';
  const value = $el.attr('value') || '';
  const text = $el.text().trim();
  if (/journee|journée/i.test(href + value + text)) {
    console.log(`href="${href}" value="${value}" text="${text}"`);
  }
});

console.log(`\n--- URL canonique / og:url éventuelle ---`);
console.log($('link[rel="canonical"]').attr('href') || '(aucune)');
console.log($('meta[property="og:url"]').attr('content') || '(aucune)');
