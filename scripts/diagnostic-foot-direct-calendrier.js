// Diagnostic en lecture seule (aucune écriture) : cherche comment lister
// tous les matchs d'une journée Ligue 3 sur foot-direct.com (page
// calendrier/résultats), pour ensuite visiter chaque page match et en
// extraire les buts + passeurs.
import * as cheerio from 'cheerio';

const targetUrl = process.env.TARGET_URL;
if (!targetUrl) { console.error('TARGET_URL manquant.'); process.exit(1); }

const res = await fetch(targetUrl, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language': 'fr-FR,fr;q=0.9',
  },
});
console.log(`URL : ${targetUrl}`);
console.log(`Statut : ${res.status}`);
if (!res.ok) { console.log('Échec, page ignorée.\n'); process.exit(0); }
const html = await res.text();
const $ = cheerio.load(html);
console.log(`Titre : ${$('title').text().trim()}`);

// Liens vers des pages match (/live/...)
const liensMatch = [...new Set($('a[href*="/live/"]').map((i, el) => $(el).attr('href')).get())];
console.log(`\nLiens /live/ trouvés : ${liensMatch.length}`);
liensMatch.slice(0, 20).forEach((h) => console.log(`  ${h}`));

// Liens de nav internes à la division (calendrier, résultats, journée précédente/suivante...)
const liensNav = [...new Set($('a[href*="/france/ligue-3"]').map((i, el) => $(el).attr('href')).get())];
console.log(`\nLiens de navigation /france/ligue-3 trouvés : ${liensNav.length}`);
liensNav.slice(0, 30).forEach((h) => console.log(`  ${h}`));
