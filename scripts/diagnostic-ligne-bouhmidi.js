// Diagnostic lecture seule : l'utilisateur signale que le classement des
// buteurs foot-direct.com affiche "K. Bouhmidi" (Karim), pas "M. Bouhmidi"
// comme rapporté par diagnostic-buteurs-non-inscrits.js. Dump le HTML brut
// de la ligne concernée pour voir si c'est une erreur de lecture des
// colonnes (structure de table différente de ce qui a été supposé) ou si
// le site affiche vraiment "M." pour un autre joueur.
import * as cheerio from 'cheerio';

const url = 'https://www.foot-direct.com/france/ligue-3/classement-buteurs';
const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
if (!res.ok) { console.error(`Échec chargement (${res.status}).`); process.exit(1); }
const html = await res.text();
const $ = cheerio.load(html);

$('table').first().find('tr').each((i, tr) => {
  const texte = $(tr).text();
  if (/bouhmidi/i.test(texte)) {
    console.log(`--- Ligne #${i} (HTML brut) ---`);
    console.log($.html(tr));
    console.log('\n--- Cellules (texte) ---');
    $(tr).find('td, th').each((j, td) => {
      console.log(`  [${j}] "${$(td).text().trim()}"`);
    });
  }
});
