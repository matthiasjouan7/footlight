// Vérifie si la page calendrier-resultats (celle qu'on scrape déjà pour
// calendrier_officiel) contient un lien vers la page match-direct de chaque
// rencontre — nécessaire pour ensuite aller y chercher buts/cartons.
import * as cheerio from 'cheerio';

const targetUrl = process.env.TARGET_URL;
if (!targetUrl) {
  console.error('TARGET_URL manquant.');
  process.exit(1);
}

const res = await fetch(targetUrl, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language': 'fr-FR,fr;q=0.9',
  },
});
const html = await res.text();
console.log(`Statut : ${res.status}, taille HTML : ${html.length}`);

const $ = cheerio.load(html);

// Tous les liens contenant "match-direct"
const matchLinks = new Set();
$('a[href*="match-direct"]').each((i, el) => {
  matchLinks.add($(el).attr('href'));
});
console.log(`\n${matchLinks.size} lien(s) "match-direct" trouvé(s) sur la page.`);
[...matchLinks].slice(0, 10).forEach((l) => console.log(' -', l));

// Pour chaque bloc .TeamScore, cherche le lien "match-direct" le plus proche
// (ancêtre <a>, ou <a> dans le même conteneur parent).
console.log('\n=== Association TeamScore <-> lien match-direct ===');
$('.TeamScore').each((i, el) => {
  const $el = $(el);
  const home = $el.find('.TeamScore__team--home').first().text().trim();
  const away = $el.find('.TeamScore__team').filter((j, t) => !$(t).hasClass('TeamScore__team--home')).first().text().trim();

  // Cherche un lien "match-direct" dans les ancêtres proches (jusqu'à 4 niveaux)
  let $ancestor = $el;
  let foundHref = null;
  for (let depth = 0; depth < 6 && !foundHref; depth++) {
    $ancestor = $ancestor.parent();
    if (!$ancestor.length) break;
    const $link = $ancestor.is('a[href*="match-direct"]') ? $ancestor : $ancestor.find('a[href*="match-direct"]').first();
    if ($link.length) foundHref = $link.attr('href');
  }
  console.log(`${home} vs ${away} -> ${foundHref || '(aucun lien trouvé à proximité)'}`);
});
