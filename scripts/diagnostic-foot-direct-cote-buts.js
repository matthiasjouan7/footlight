// Diagnostic en lecture seule (aucune écriture) : sur une page de match
// foot-direct.com déjà jouée, cherche comment savoir de QUEL côté (domicile
// ou extérieur) vient chaque but — nécessaire pour reconstituer le score
// minute par minute (les buts sont déjà identifiables avec leur minute,
// cf. diagnostic-foot-direct-changements.js), avant d'écrire le calcul
// d'impact des remplaçants.
import * as cheerio from 'cheerio';

const targetUrl = process.env.TARGET_URL;
if (!targetUrl) { console.error('TARGET_URL manquant.'); process.exit(1); }

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'fr-FR,fr;q=0.9',
};

const res = await fetch(targetUrl, { headers: HEADERS });
console.log(`Statut : ${res.status}`);
if (!res.ok) { console.error('Échec chargement.'); process.exit(1); }
const html = await res.text();
const $ = cheerio.load(html);
console.log(`Titre : ${$('title').text().trim()}`);

// Éléments [class*="goal"] qui commencent par une minute : dump du HTML
// brut (attributs + structure) pour repérer un indicateur de côté (classe,
// position dans un conteneur home/away, etc.).
const buts = $('[class*="goal"]').filter((i, el) => {
  const txt = $(el).text().trim();
  return /^\d+(\+\d+)?['’]/.test(txt);
});
console.log(`\n--- ${buts.length} but(s) : HTML brut de l'élément + de son parent ---`);
buts.each((i, el) => {
  const $el = $(el);
  console.log(`\n[${i}] classe="${$el.attr('class') || ''}"`);
  console.log(`  outerHTML (tronqué) : ${$.html($el).replace(/\s+/g, ' ').slice(0, 400)}`);
  const $parent = $el.parent();
  console.log(`  parent: <${$parent.prop('tagName')} class="${$parent.attr('class') || ''}">`);
  const $grandParent = $parent.parent();
  console.log(`  grand-parent: <${$grandParent.prop('tagName')} class="${$grandParent.attr('class') || ''}">`);
});
