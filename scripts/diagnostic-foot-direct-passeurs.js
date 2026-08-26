// Diagnostic lecture seule : l'utilisateur demande d'utiliser
// foot-direct.com/france/ligue-3/classement-passeurs comme source pour les
// passes décisives, puisque L'Équipe (notre source habituelle) ne publie pas
// cette donnée du tout (confirmé par diagnostic-assists-bensoula.js). Vérifie
// d'abord la structure de la page et si Kamil Bensoula y apparaît, avant
// d'envisager un script de synchro dédié.
import * as cheerio from 'cheerio';

const URL = 'https://www.foot-direct.com/france/ligue-3/classement-passeurs';
const res = await fetch(URL, { headers: { 'User-Agent': 'Mozilla/5.0' } });
console.log(`Statut HTTP : ${res.status}`);
if (!res.ok) { console.error('Échec chargement page.'); process.exit(1); }
const html = await res.text();
console.log(`Taille HTML : ${html.length} caractères`);

const $ = cheerio.load(html);
console.log(`\nNombre de <table> : ${$('table').length}`);
$('table').each((i, table) => {
  console.log(`\n--- Table #${i} ---`);
  $(table).find('tr').slice(0, 40).each((j, tr) => {
    const cols = $(tr).find('td, th').map((k, td) => $(td).text().trim()).get();
    if (cols.length) console.log(`  [${j}] ${cols.join(' | ')}`);
  });
});

const contientBensoula = html.toLowerCase().includes('bensoula');
console.log(`\n"Bensoula" trouvé dans le HTML brut : ${contientBensoula}`);
