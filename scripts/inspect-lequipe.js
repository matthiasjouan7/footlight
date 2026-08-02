// Inspecte la structure d'une ligne de match complète sur lequipe.fr :
// comment la date est associée à chaque match TeamScore (au niveau de la
// journée entière, ou par match individuellement).
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
console.log(`Taille : ${html.length} caractères`);

const $ = cheerio.load(html);

console.log(`Nombre de blocs .TeamScore : ${$('.TeamScore').length}`);

// Remonte l'ancêtre de chaque .TeamScore jusqu'à trouver un conteneur
// contenant une date (ex: "16 mai", jour de la semaine), et imprime le HTML
// complet de ce conteneur pour les 3 premiers matchs.
$('.TeamScore').slice(0, 3).each(function (i) {
  console.log(`\n=== Match [${i}] ===`);
  console.log(`Équipes/score (texte) : "${$(this).text().trim()}"`);

  let ancestor = $(this).parent();
  for (let level = 1; level <= 5; level++) {
    const text = ancestor.text().trim();
    console.log(`  Ancêtre niveau ${level} <${ancestor.prop('tagName')}> class="${ancestor.attr('class') || ''}" — longueur texte: ${text.length}`);
    ancestor = ancestor.parent();
  }
});

// Cherche des éléments dont le texte ressemble à une date (jours de la
// semaine en français) proches des scores.
console.log('\n--- Éléments contenant un jour de semaine (max 5) ---');
const jours = /lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche/i;
$('*').filter(function () {
  const own = $(this).contents().filter(function () { return this.type === 'text'; }).text();
  return jours.test(own);
}).slice(0, 5).each(function (i) {
  console.log(`[${i}] <${this.tagName}> class="${$(this).attr('class') || ''}" texte="${$(this).text().trim().slice(0, 100)}"`);
});
