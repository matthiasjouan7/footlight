// Inspection (lecture seule) d'une page flashscore.fr, pour voir si
// l'effectif/les stats/les absences sont présents dans le HTML brut (sans
// exécuter de JavaScript) ou si, comme lequipe.fr/fiche/..., c'est une SPA
// dont le contenu n'apparaît qu'après rendu côté client.
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
console.log(`Statut : ${res.status}`);
const html = await res.text();
console.log(`Taille HTML : ${html.length} caractères`);

const $ = cheerio.load(html);
console.log(`Titre : ${$('title').text().trim()}`);

console.log(`\n=== Toutes les <table> de la page (${$('table').length}) ===`);
$('table').each((i, el) => {
  const text = $(el).text().replace(/\s+/g, ' ').trim();
  console.log(`\n--- table #${i} (classe: "${$(el).attr('class') || ''}", ${text.length} car.) ---`);
  console.log(text.slice(0, 400));
});

// Flashscore charge généralement son contenu via une API séparée (souvent
// visible comme un appel XHR/fetch vers un sous-domaine dédié) : on cherche
// des indices de ce genre d'appel dans le HTML/JS statique.
const decoded = html.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
const apiHints = decoded.match(/https?:\/\/[a-z0-9.-]*flashscore[a-z0-9.-]*\/[^"'\s]*/gi) || [];
const uniqueHints = [...new Set(apiHints)].slice(0, 30);
console.log(`\n=== URLs flashscore référencées dans le HTML (${uniqueHints.length}) ===`);
uniqueHints.forEach((u) => console.log(' -', u));

const keywords = ['absent', 'blessé', 'blessure', 'suspendu', 'effectif', 'squad', 'roster', 'injur'];
keywords.forEach((kw) => {
  const re = new RegExp(kw, 'gi');
  const matches = decoded.match(re) || [];
  if (matches.length) {
    console.log(`\nmot-clé "${kw}" : ${matches.length} occurrence(s)`);
  }
});

// Bloc de texte visible principal (hors script/style), pour voir si des
// noms de joueurs apparaissent tout de même en clair quelque part.
$('script, style, noscript').remove();
const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
console.log(`\n=== Texte visible du <body> (${bodyText.length} car.), extrait ===`);
console.log(bodyText.slice(0, 2000));
