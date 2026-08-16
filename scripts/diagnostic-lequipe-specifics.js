// Diagnostic en lecture seule (aucune écriture en base) : inspecte la
// structure brute des données de match sur lequipe.fr pour vérifier si une
// info de passe décisive existe déjà dans les événements de but, avant de
// décider comment l'extraire automatiquement.
import * as cheerio from 'cheerio';

const targetUrl = process.env.TARGET_URL;
if (!targetUrl) { console.error('TARGET_URL manquant.'); process.exit(1); }

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'fr-FR,fr;q=0.9',
};

const resCal = await fetch(targetUrl, { headers });
if (!resCal.ok) { console.error(`Échec chargement calendrier : statut ${resCal.status}`); process.exit(1); }
const htmlCal = await resCal.text();
const $cal = cheerio.load(htmlCal);

let matchUrl = null;
$cal('.TeamScore').each((i, el) => {
  if (matchUrl) return;
  let $ancestor = $cal(el);
  for (let depth = 0; depth < 6 && !matchUrl; depth++) {
    $ancestor = $ancestor.parent();
    if (!$ancestor.length) break;
    const $link = $ancestor.is('a[href*="match-direct"]') ? $ancestor : $ancestor.find('a[href*="match-direct"]').first();
    if ($link.length) matchUrl = new URL($link.attr('href'), targetUrl).toString();
  }
});
if (!matchUrl) { console.error('Aucun lien match-direct trouvé sur la page calendrier.'); process.exit(1); }
console.log(`Match choisi : ${matchUrl}\n`);

const resMatch = await fetch(matchUrl, { headers });
if (!resMatch.ok) { console.error(`Échec chargement page match : statut ${resMatch.status}`); process.exit(1); }
const htmlMatch = await resMatch.text();
const decoded = htmlMatch
  .replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

function extractBalancedObject(text, keyPattern) {
  const m = text.match(keyPattern);
  if (!m) return null;
  const start = m.index + m[0].length - 1;
  let depth = 0, inString = false, escaped = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') { inString = true; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return text.slice(start, i + 1); }
  }
  return null;
}

const specificsRaw = extractBalancedObject(decoded, /"specifics"\s*:\s*\{/);
if (!specificsRaw) { console.error('Objet "specifics" introuvable.'); process.exit(1); }
const specifics = JSON.parse(specificsRaw);

console.log('Clés de specifics :', Object.keys(specifics));
console.log('Clés de specifics.domicile :', Object.keys(specifics.domicile || {}));
console.log('\n--- Premier but (domicile), objet complet ---');
console.log(JSON.stringify((specifics.domicile?.buts || [])[0], null, 2));
console.log('\n--- Tous les buts (domicile), objet complet ---');
console.log(JSON.stringify(specifics.domicile?.buts, null, 2));
console.log('\n--- Tous les buts (extérieur), objet complet ---');
console.log(JSON.stringify(specifics.exterieur?.buts, null, 2));
