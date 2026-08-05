// Diagnostic (lecture seule) : trouve un match TERMINÉ de National 1 saison
// 2025-2026 (celle d'avant, puisque 2026-2027 n'a pas encore débuté) et
// vérifie si sa page match-direct expose des passes décisives, en plus des
// remplacements déjà confirmés exploitables pour calculer les minutes
// jouées.
import * as cheerio from 'cheerio';

const calendrierUrl = process.env.TARGET_URL;
if (!calendrierUrl) { console.error('TARGET_URL manquant.'); process.exit(1); }

const resCal = await fetch(calendrierUrl, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language': 'fr-FR,fr;q=0.9',
  },
});
console.log(`Statut calendrier : ${resCal.status}`);
const htmlCal = await resCal.text();
console.log(`Taille HTML : ${htmlCal.length} caractères`);
console.log(`Titre : ${(htmlCal.match(/<title>(.*?)<\/title>/) || [])[1] || '(non trouvé)'}`);
console.log(`Occurrences de "TeamScore" dans le HTML brut : ${(htmlCal.match(/TeamScore/g) || []).length}`);
console.log(`Occurrences de "match-direct" dans le HTML brut : ${(htmlCal.match(/match-direct/g) || []).length}`);
const $cal = cheerio.load(htmlCal);

const rencontres = [];
$cal('.TeamScore').each((i, el) => {
  const $el = $cal(el);
  const home = $el.find('.TeamScore__team--home').first().text().trim() || null;
  const away = $el.find('.TeamScore__team').filter((j, t) => !$cal(t).hasClass('TeamScore__team--home')).first().text().trim() || null;
  if (!home || !away) return;
  let $ancestor = $el;
  let href = null;
  for (let depth = 0; depth < 6 && !href; depth++) {
    $ancestor = $ancestor.parent();
    if (!$ancestor.length) break;
    const $link = $ancestor.is('a[href*="match-direct"]') ? $ancestor : $ancestor.find('a[href*="match-direct"]').first();
    if ($link.length) href = $link.attr('href');
  }
  if (href) rencontres.push({ home, away, matchUrl: new URL(href, calendrierUrl).toString() });
});
console.log(`${rencontres.length} match(s) trouvé(s) sur la page.`);
if (!rencontres.length) process.exit(0);

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

// Cherche le premier match dont le statut est "termine" (les autres n'ont pas encore eu lieu).
for (const r of rencontres) {
  const resMatch = await fetch(r.matchUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept-Language': 'fr-FR,fr;q=0.9',
    },
  });
  if (!resMatch.ok) continue;
  const htmlMatch = await resMatch.text();
  const decoded = htmlMatch
    .replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  const specificsRaw = extractBalancedObject(decoded, /"specifics"\s*:\s*\{/);
  if (!specificsRaw) continue;
  let specifics;
  try { specifics = JSON.parse(specificsRaw); } catch { continue; }
  const estTermine = decoded.includes('"type":"termine"') || decoded.includes('"vainqueur"');
  if (!estTermine) { console.log(`${r.home} vs ${r.away} : pas encore joué, ignoré.`); continue; }

  console.log(`\n=== Match terminé retenu : ${r.home} vs ${r.away} (${r.matchUrl}) ===`);
  for (const cote of ['domicile', 'exterieur']) {
    if (specifics[cote]) {
      console.log(`Clés specifics.${cote} : ${Object.keys(specifics[cote]).join(', ')}`);
      console.log(`  buts : ${JSON.stringify(specifics[cote].buts)}`);
      console.log(`  remplacements : ${JSON.stringify(specifics[cote].remplacements)}`);
      console.log(`  ids_titulaires : ${JSON.stringify(specifics[cote].ids_titulaires)}`);
      console.log(`  ids_remplacants : ${JSON.stringify(specifics[cote].ids_remplacants)}`);
    }
  }
  for (const cle of ['passesDecisives', 'passes_decisives', 'confrontations', 'passe']) {
    console.log(`"${cle}" présent dans le HTML brut : ${decoded.includes(`"${cle}"`)}`);
  }
  process.exit(0);
}
console.log('\nAucun match terminé trouvé sur cette page (tous à venir).');
