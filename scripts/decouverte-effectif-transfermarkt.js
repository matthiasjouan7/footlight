// Découverte (lecture seule) de la structure d'une page effectif
// transfermarkt.fr : affiche ce qui a été détecté (nom, poste, date de
// naissance) pour valider les sélecteurs avant de construire un vrai script
// d'import. Transfermarkt n'est pas accessible depuis l'environnement de
// dev (proxy réseau), donc ce script sert à "voir" la page réelle via
// GitHub Actions.
import * as cheerio from 'cheerio';

const startUrl = process.env.TARGET_URL;
if (!startUrl) { console.error('TARGET_URL manquant.'); process.exit(1); }

// La page "startseite" (accueil club) n'a pas l'effectif : on bascule vers
// "kader" (effectif), qui liste les joueurs avec poste/naissance/nationalité.
const kaderUrl = startUrl.includes('/kader/') ? startUrl : startUrl.replace('/startseite/', '/kader/');
console.log(`URL effectif : ${kaderUrl}`);

const res = await fetch(kaderUrl, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language': 'fr-FR,fr;q=0.9',
  },
});
console.log(`Statut HTTP : ${res.status}`);
if (!res.ok) { console.error('Échec du chargement.'); process.exit(1); }

const html = await res.text();
console.log(`Taille de la page : ${html.length} caractères.`);
const $ = cheerio.load(html);

console.log(`\nTitre de la page : "${$('title').text().trim()}"`);
console.log(`Nombre de <table class="items">: ${$('table.items').length}`);
console.log(`Nombre de lignes <tr> dans ces tables : ${$('table.items tr').length}`);

const lignes = [];
$('table.items > tbody > tr').each((i, el) => {
  const $row = $(el);
  const nom = $row.find('td.posrela a').first().text().trim()
    || $row.find('td.posrela').text().trim().split('\n')[0].trim();
  const posteLignes = $row.find('td.posrela table.inline-table tr');
  const poste = posteLignes.length > 1 ? $(posteLignes[1]).text().trim() : '';
  const cellulesZentriert = $row.find('td.zentriert').map((j, c) => $(c).text().trim()).get();
  if (nom) lignes.push({ nom, poste, cellulesZentriert });
});

console.log(`\n${lignes.length} ligne(s) joueur détectée(s) avec les sélecteurs "table.items" :`);
lignes.slice(0, 5).forEach((l) => console.log(JSON.stringify(l)));

if (!lignes.length) {
  console.log('\nAucune ligne détectée avec ces sélecteurs — extrait du HTML autour de la première occurrence de "posrela" ou "items" :');
  const idx = html.indexOf('posrela') !== -1 ? html.indexOf('posrela') : html.indexOf('items');
  console.log(idx !== -1 ? html.slice(Math.max(0, idx - 300), idx + 1500) : 'Aucun indice "posrela"/"items" trouvé dans le HTML — la page a peut-être une structure très différente ou bloque les requêtes automatisées.');
}
