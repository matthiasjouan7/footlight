// Inspection (lecture seule) d'une fiche joueur lequipe.fr, pour voir si des
// stats individuelles (buts, cartons, matchs joués...) et un statut
// absent/blessé/suspendu y sont disponibles.
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

const decoded = html.replace(/&quot;/g, '"').replace(/&amp;/g, '&');

const keywords = ['absent', 'blessé', 'blessure', 'suspendu', 'suspension', 'indisponible', 'but', 'carton', 'statistique', 'stat'];
keywords.forEach((kw) => {
  const re = new RegExp(kw, 'gi');
  const matches = decoded.match(re) || [];
  if (matches.length) {
    const idx = decoded.search(re);
    const start = Math.max(0, idx - 60);
    const end = Math.min(decoded.length, idx + 200);
    console.log(`\nmot-clé "${kw}" : ${matches.length} occurrence(s)`);
    console.log(`  ex: "...${decoded.slice(start, end).replace(/\s+/g, ' ').trim()}..."`);
  }
});

console.log(`\n=== Toutes les <table> de la page (${$('table').length}) ===`);
$('table').each((i, el) => {
  const text = $(el).text().replace(/\s+/g, ' ').trim();
  console.log(`\n--- table #${i} (classe: "${$(el).attr('class') || ''}", ${text.length} car.) ---`);
  console.log(text.slice(0, 600));
});

// Sections avec une classe contenant "stat" ou "fiche" (souvent les blocs
// de contenu structuré sur les fiches lequipe.fr).
console.log('\n=== Sections avec classe contenant "stat" ===');
$('[class*="stat" i]').each((i, el) => {
  const text = $(el).text().replace(/\s+/g, ' ').trim();
  if (text.length > 10 && text.length < 2000) {
    console.log(`\n--- élément #${i} (classe: "${$(el).attr('class')}") ---`);
    console.log(text.slice(0, 500));
  }
});

// Objet JSON embarqué éventuel (comme sur les pages match).
const idx = decoded.search(/"stats?"\s*:/i);
if (idx !== -1) {
  console.log('\n=== Contexte autour de "stat(s)" (JSON potentiel) ===');
  console.log(decoded.slice(Math.max(0, idx - 200), idx + 1500));
}
