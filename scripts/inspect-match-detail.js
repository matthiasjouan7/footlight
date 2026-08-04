// Inspection (lecture seule) d'une page match-direct de lequipe.fr, pour
// comprendre la structure exacte des données avant d'écrire un vrai
// extracteur. Affiche le contexte autour des événements (buts, cartons)
// et les clés d'un éventuel objet JS embarqué contenant les données du match.
const targetUrl = process.env.TARGET_URL;
if (!targetUrl) {
  console.error('TARGET_URL manquant.');
  process.exit(1);
}

const res = await fetch(targetUrl, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language': 'fr-FR,fr;q=0.9',
  },
});
console.log(`Statut : ${res.status}`);
const html = await res.text();
console.log(`Taille HTML : ${html.length} caractères`);

const titleMatch = html.match(/<title>(.*?)<\/title>/);
console.log(`Titre : ${titleMatch ? titleMatch[1] : '(non trouvé)'}`);

function dumpContext(label, regex, contextChars = 300) {
  console.log(`\n=== ${label} ===`);
  let m;
  let count = 0;
  const re = new RegExp(regex, 'gi');
  while ((m = re.exec(html)) !== null && count < 6) {
    const start = Math.max(0, m.index - contextChars);
    const end = Math.min(html.length, m.index + contextChars);
    console.log(`--- occurrence ${count + 1} (index ${m.index}) ---`);
    console.log(html.slice(start, end));
    count++;
  }
  if (count === 0) console.log('(aucune occurrence)');
}

dumpContext('But de', 'but\\s+de\\s+[a-zéèêà.\\s-]+\\d+', 250);
dumpContext('Carton jaune', 'carton\\s+jaune\\s+pour\\s+[a-zéèêà.\\s-]+\\d+', 250);
dumpContext('Carton rouge', 'carton\\s+rouge\\s+pour\\s+[a-zéèêà.\\s-]+\\d+', 250);
dumpContext('ids_titulaires', 'ids_titulaires', 400);
dumpContext('ids_remplacants', 'ids_remplacants', 400);
dumpContext('remplacements', '"remplacements"', 400);
dumpContext('sportifs array', '"sportifs"\\s*:', 500);
dumpContext('cartons key', '"cartons"\\s*:', 400);
dumpContext('buts key', '"buts"\\s*:', 400);

// Cherche un gros objet JS embarqué (souvent après "window.__" ou dans un
// <script> Nuxt) pour repérer où vivent ces données.
const scriptBlocks = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)]
  .map((m, i) => ({ i, len: m[1].length, sample: m[1].slice(0, 120) }))
  .filter((b) => b.len > 2000)
  .sort((a, b) => b.len - a.len)
  .slice(0, 8);
console.log('\n=== Plus gros blocs <script> (>2000 caractères) ===');
scriptBlocks.forEach((b) => console.log(`bloc #${b.i} — ${b.len} caractères — début : ${b.sample.replace(/\s+/g, ' ')}`));
