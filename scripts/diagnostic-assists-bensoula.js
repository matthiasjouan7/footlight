// Diagnostic lecture seule : l'utilisateur signale que Kamil Bensoula a 2
// passes décisives (vues sur un autre site, "foot direct"), mais la synchro
// L'Équipe (rattrapage-lequipe-match-stats.js / lib-sync-lequipe-match-stats.js)
// a laissé passes_decisives à 0 sur ses 3 premiers matchs. Vérifie la cause :
// soit L'Équipe ne publie tout simplement pas de passe décisive sur ces 3
// matchs pour ce joueur (écart de couverture entre sites, rien à corriger),
// soit L'Équipe la publie mais le script de synchro ne l'extrait jamais
// (aucune ligne de code n'existe pour "passes_decisives" dans la boucle
// d'extraction de lib-sync-lequipe-match-stats.js — à confirmer ici).
import * as cheerio from 'cheerio';

const URLS = [
  { adversaire: 'Versailles', url: 'https://www.lequipe.fr/Football/ligue-3/page-calendrier-resultats/1re-journee' },
  { adversaire: 'Amiens', url: 'https://www.lequipe.fr/Football/ligue-3/page-calendrier-resultats/2e-journee' },
  { adversaire: 'Cannes', url: 'https://www.lequipe.fr/Football/ligue-3/page-calendrier-resultats/3e-journee' },
];

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

for (const { adversaire, url } of URLS) {
  console.log(`\n=== Journée vs ${adversaire} (${url}) ===`);
  const resCal = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!resCal.ok) { console.log(`  Échec chargement calendrier (${resCal.status})`); continue; }
  const htmlCal = await resCal.text();
  const $ = cheerio.load(htmlCal);
  let matchUrl = null;
  $('a[href*="/match-"], a[href*="/direct/"]').each((_, el) => {
    const texte = $(el).text().toLowerCase();
    if ((texte.includes('roche') || texte.includes('vfc')) && !matchUrl) {
      matchUrl = new URL($(el).attr('href'), url).toString();
    }
  });
  if (!matchUrl) { console.log('  Lien du match introuvable sur la page calendrier.'); continue; }
  console.log(`  Match URL : ${matchUrl}`);

  const resMatch = await fetch(matchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!resMatch.ok) { console.log(`  Échec chargement page match (${resMatch.status})`); continue; }
  const htmlMatch = await resMatch.text();
  const decoded = htmlMatch.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

  const specificsRaw = extractBalancedObject(decoded, /"specifics"\s*:\s*\{/);
  if (!specificsRaw) { console.log('  Bloc "specifics" introuvable.'); continue; }
  let specifics;
  try { specifics = JSON.parse(specificsRaw); }
  catch (e) { console.log(`  Échec JSON.parse : ${e.message}`); continue; }

  for (const cote of ['domicile', 'exterieur']) {
    const side = specifics[cote];
    if (!side?.buts?.length) continue;
    console.log(`  Côté ${cote} — buts bruts :`);
    for (const b of side.buts) console.log(`    ${JSON.stringify(b)}`);
  }
  // Cherche toute occurrence du mot "passe" dans le bloc specifics brut (clé
  // de champ potentielle qu'on n'aurait pas anticipée).
  const occurrencesPasse = [...specificsRaw.matchAll(/"[a-zA-Z_]*passe[a-zA-Z_]*"\s*:/gi)].map((m) => m[0]);
  console.log(`  Clés contenant "passe" dans specifics : ${occurrencesPasse.length ? [...new Set(occurrencesPasse)].join(', ') : 'aucune'}`);
}
