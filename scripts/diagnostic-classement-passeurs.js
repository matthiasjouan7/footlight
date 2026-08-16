// Diagnostic en lecture seule (aucune écriture) : inspecte la structure
// d'une page "classement des passeurs" (footmercato.net ou foot-direct.com)
// pour savoir comment en extraire nom de joueur + nombre de passes
// décisives, avant d'écrire un vrai script de synchro.
import * as cheerio from 'cheerio';

const targetUrl = process.env.TARGET_URL;
if (!targetUrl) { console.error('TARGET_URL manquant.'); process.exit(1); }

const res = await fetch(targetUrl, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language': 'fr-FR,fr;q=0.9',
  },
});
console.log(`Statut : ${res.status}`);
if (!res.ok) { console.error('Échec chargement.'); process.exit(1); }
const html = await res.text();
console.log(`Taille HTML : ${html.length} caractères`);
const $ = cheerio.load(html);

console.log(`\nNombre de <table> : ${$('table').length}`);
console.log(`Titre de la page : ${$('title').text().trim()}`);

// Liste toutes les tables trouvées avec leurs premières lignes.
$('table').each((i, table) => {
  const $table = $(table);
  console.log(`\n--- Table #${i} (class="${$table.attr('class') || ''}") ---`);
  const rows = $table.find('tr').slice(0, 8);
  rows.each((j, tr) => {
    const cells = $(tr).find('td,th').map((k, td) => $(td).text().trim().replace(/\s+/g, ' ')).get();
    console.log(`  row ${j}: [${cells.join(' | ')}]`);
  });
});

// Repli : cherche des motifs "classement"/"liste" génériques si aucune table.
if ($('table').length === 0) {
  console.log('\nAucune <table> trouvée, recherche de conteneurs de liste courants...');
  const candidats = ['[class*="ranking"]', '[class*="classement"]', '[class*="list"]', '[class*="player"]'];
  for (const sel of candidats) {
    const n = $(sel).length;
    if (n > 0) console.log(`  ${sel} : ${n} élément(s), ex: "${$(sel).first().text().trim().slice(0, 200)}"`);
  }
}
