// Diagnostic (lecture seule) : dumpe la structure de l'objet "specifics"
// d'une page match-direct lequipe.fr (et toute section "confrontations"
// trouvée), pour localiser précisément où vivent les passes décisives et
// vérifier si des minutes jouées / remplacements sont disponibles quelque
// part sur la page, avant d'écrire un vrai extracteur.
const targetUrl = process.env.TARGET_URL;
if (!targetUrl) { console.error('TARGET_URL manquant.'); process.exit(1); }

const res = await fetch(targetUrl, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language': 'fr-FR,fr;q=0.9',
  },
});
console.log(`Statut : ${res.status}`);
const html = await res.text();
const decoded = html
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

function resume(val, depth = 0) {
  if (depth > 2) return typeof val;
  if (Array.isArray(val)) return `array(${val.length})${val.length ? ' premier: ' + JSON.stringify(resume(val[0], depth + 1)) : ''}`;
  if (val && typeof val === 'object') {
    const keys = Object.keys(val);
    return `{${keys.join(', ')}}`;
  }
  return JSON.stringify(val);
}

const specificsRaw = extractBalancedObject(decoded, /"specifics"\s*:\s*\{/);
if (specificsRaw) {
  const specifics = JSON.parse(specificsRaw);
  console.log('\n=== Clés top-level de "specifics" ===');
  console.log(Object.keys(specifics).join(', '));
  for (const cote of ['domicile', 'exterieur']) {
    if (specifics[cote]) {
      console.log(`\n=== Clés de specifics.${cote} ===`);
      console.log(Object.keys(specifics[cote]).join(', '));
      for (const [k, v] of Object.entries(specifics[cote])) {
        console.log(`  ${cote}.${k} : ${resume(v)}`);
      }
    }
  }
} else {
  console.log('Objet "specifics" introuvable.');
}

for (const cle of ['confrontations', 'passesDecisives', 'passes_decisives', 'compositions', 'remplacements', 'minutesJouees', 'minutes_jouees']) {
  const raw = extractBalancedObject(decoded, new RegExp(`"${cle}"\\s*:\\s*\\{`));
  const rawArr = html.match(new RegExp(`"${cle}"\\s*:\\s*\\[`));
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      console.log(`\n=== "${cle}" trouvé (objet) ===`);
      console.log(resume(parsed));
    } catch { console.log(`\n=== "${cle}" trouvé mais JSON.parse a échoué ===`); }
  } else if (rawArr) {
    console.log(`\n=== "${cle}" trouvé (tableau) — contexte ===`);
    const idx = rawArr.index;
    console.log(html.slice(Math.max(0, idx - 50), idx + 400));
  } else {
    console.log(`\n=== "${cle}" : non trouvé ===`);
  }
}

console.log('\n=== Recherche libre de "minute" dans le HTML (contexte) ===');
const minuteMatches = [...html.matchAll(/.{80}minute[s]?.{80}/gi)].slice(0, 5);
minuteMatches.forEach((m, i) => console.log(`-- occurrence ${i + 1} --\n${m[0]}`));
