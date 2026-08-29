// Diagnostic lecture seule : le rattrapage calendrier échoue à parser la
// date sur 23 des 34 journées de National 1 groupe C (celles hors de la
// fenêtre proche de la date du jour) — probablement un format de date
// différent (mois abrégé ?) sur les journées éloignées, non couvert par
// MOIS_FR (noms de mois en toutes lettres uniquement). Dump le texte brut
// de la légende de date sur une journée qui échoue, pour voir le vrai
// format à gérer.
import * as cheerio from 'cheerio';

const targetUrl = process.env.TARGET_URL;
if (!targetUrl) { console.error('TARGET_URL manquant.'); process.exit(1); }

const res = await fetch(targetUrl, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language': 'fr-FR,fr;q=0.9',
  },
});
console.log(`Statut HTTP : ${res.status}`);
const html = await res.text();
const $ = cheerio.load(html);

console.log(`\nTitre : "${$('title').text().trim()}"`);
console.log(`Journée (.SelectNav__label) : "${$('.SelectNav__label').first().text().trim()}"`);

console.log('\nToutes les ".caption.caption--small" contenant un jour de semaine :');
$('.caption.caption--small')
  .filter((i, el) => /lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche/i.test($(el).text()))
  .each((i, el) => console.log(`  [${i}] "${$(el).text().trim()}"`));

console.log('\nToutes les ".caption.caption--small" (sans filtre, 20 premières) :');
$('.caption.caption--small').slice(0, 20).each((i, el) => console.log(`  [${i}] "${$(el).text().trim()}"`));
