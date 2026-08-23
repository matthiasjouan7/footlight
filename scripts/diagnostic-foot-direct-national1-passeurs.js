// Diagnostic lecture seule : la page classement-passeurs National 1
// (confirmée accessible, statut 200) ne contient aucun <table> détecté par
// $('table').first() — contrairement à Ligue 3 où sync-classement-passeurs.js
// fonctionne déjà avec cette sélection. Dump la structure réelle de la page
// (candidats de listes/lignes) pour comprendre pourquoi avant de câbler le
// cron dessus.
import * as cheerio from 'cheerio';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'fr-FR,fr;q=0.9',
};

const url = 'https://www.foot-direct.com/france/national-1/classement-passeurs';
const res = await fetch(url, { headers: HEADERS });
console.log(`Statut : ${res.status}`);
const html = await res.text();
console.log(`Taille HTML : ${html.length} caractères\n`);

const $ = cheerio.load(html);
console.log(`Nombre de <table> : ${$('table').length}`);
console.log(`Nombre de <tr> (toutes tables confondues) : ${$('tr').length}`);

// Cherche des conteneurs de type "classement"/"ranking"/"stats" dans les
// classes, comme alternative à une vraie <table>.
const classesInteressantes = new Set();
$('[class]').each((i, el) => {
  const cls = $(el).attr('class') || '';
  if (/class|rank|stat|passeur|player|list/i.test(cls)) classesInteressantes.add(cls);
});
console.log(`\n${classesInteressantes.size} classe(s) candidate(s) trouvée(s) :`);
for (const c of [...classesInteressantes].slice(0, 40)) console.log(`  "${c}"`);

// Dump les 800 premiers caractères du <body> pour un aperçu brut.
console.log('\n--- Aperçu body (800 premiers caractères) ---');
console.log($('body').text().replace(/\s+/g, ' ').trim().slice(0, 800));
