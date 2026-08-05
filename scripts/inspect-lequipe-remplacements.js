// Diagnostic (lecture seule) : dumpe le contenu réel (pas juste les clés)
// de "remplacements", "ids_titulaires", "ids_remplacants" et "sportifs"
// pour un match terminé, afin de savoir sous quelle forme exacte sortant/
// entrant référencent un joueur (id brut ou objet), avant d'écrire
// l'extracteur de minutes jouées.
const targetUrl = process.env.TARGET_URL;
if (!targetUrl) { console.error('TARGET_URL manquant.'); process.exit(1); }

const res = await fetch(targetUrl, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language': 'fr-FR,fr;q=0.9',
  },
});
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

const specificsRaw = extractBalancedObject(decoded, /"specifics"\s*:\s*\{/);
const specifics = JSON.parse(specificsRaw);

console.log(`prolongation : ${JSON.stringify(specifics.prolongation)}`);

for (const cote of ['domicile', 'exterieur']) {
  const s = specifics[cote];
  console.log(`\n=== ${cote} (${s.equipe?.nom}) ===`);
  console.log(`ids_titulaires : ${JSON.stringify(s.ids_titulaires)}`);
  console.log(`ids_remplacants : ${JSON.stringify(s.ids_remplacants)}`);
  console.log(`remplacements (complet) : ${JSON.stringify(s.remplacements, null, 1)}`);
  console.log(`sportifs (id + nom seulement) : ${JSON.stringify(s.sportifs.map((j) => ({ id: j.id, nom: j.nom_complet })))}`);
}
