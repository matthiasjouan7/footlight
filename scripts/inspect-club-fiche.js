// Inspection (lecture seule) d'une page fiche club de lequipe.fr, pour voir
// si l'effectif, les joueurs absents (blessés/suspendus) et des stats
// individuelles y sont disponibles, avant de décider quoi construire.
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

// Cherche des liens vers des fiches joueurs (indique un effectif listé).
const joueurLinks = new Set();
$('a[href*="FootballFicheJoueur"]').each((i, el) => joueurLinks.add($(el).attr('href')));
console.log(`\n${joueurLinks.size} lien(s) vers des fiches joueurs trouvés.`);
[...joueurLinks].slice(0, 30).forEach((l) => console.log(' -', l));

// Cherche des mots-clés liés aux absences/blessures/suspensions et aux stats.
const decoded = html.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
const keywords = ['absent', 'blessé', 'blessure', 'suspendu', 'suspension', 'indisponible', 'effectif', 'compositio'];
keywords.forEach((kw) => {
  const re = new RegExp(kw, 'gi');
  const matches = decoded.match(re) || [];
  if (matches.length) {
    const idx = decoded.search(re);
    const start = Math.max(0, idx - 60);
    const end = Math.min(decoded.length, idx + 150);
    console.log(`\nmot-clé "${kw}" : ${matches.length} occurrence(s)`);
    console.log(`  ex: "...${decoded.slice(start, end).replace(/\s+/g, ' ').trim()}..."`);
  }
});

// Cherche un objet JSON embarqué similaire à ce qu'on a trouvé sur les pages
// match (attribut HTML avec des données encodées en entités).
const idx = decoded.indexOf('"sportifs"');
if (idx !== -1) {
  console.log('\n=== Contexte autour de "sportifs" ===');
  console.log(decoded.slice(Math.max(0, idx - 100), idx + 1200));
}
const idxEffectif = decoded.search(/"effectif"|"joueurs"/i);
if (idxEffectif !== -1) {
  console.log('\n=== Contexte autour de "effectif"/"joueurs" ===');
  console.log(decoded.slice(Math.max(0, idxEffectif - 100), idxEffectif + 1200));
}

// La classe CSS "effectifclub" indique une vraie table d'effectif sur la
// page : on cible directement cet élément (pas juste sa définition CSS).
console.log('\n=== Table(s) .effectifclub ===');
const $eff = $('.effectifclub, [class*="effectifclub"]');
console.log(`${$eff.length} élément(s) trouvé(s) avec cette classe.`);
$eff.each((i, el) => {
  const text = $(el).text().replace(/\s+/g, ' ').trim();
  console.log(`\n--- élément #${i} (${text.length} caractères de texte) ---`);
  console.log(text.slice(0, 1500));
});

// Au cas où la table serait ailleurs (ex: <table> générique avec des noms
// de joueurs), on liste toutes les <table> de la page.
console.log(`\n=== Toutes les <table> de la page (${$('table').length}) ===`);
$('table').each((i, el) => {
  const text = $(el).text().replace(/\s+/g, ' ').trim();
  console.log(`\n--- table #${i} (classe: "${$(el).attr('class') || ''}", ${text.length} car.) ---`);
  console.log(text.slice(0, 400));
});
