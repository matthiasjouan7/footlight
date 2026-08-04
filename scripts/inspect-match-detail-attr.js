// Les occurrences de "ids_titulaires"/"sportifs"/"cartons" trouvées dans le
// HTML brut sont encodées en entités HTML (&quot;), ce qui indique qu'elles
// vivent dans un attribut HTML (pas dans un <script>). On affiche un contexte
// large + le nom de la balise/attribut porteur pour confirmer.
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
const html = await res.text();
console.log(`Taille HTML : ${html.length}`);

const idx = html.indexOf('ids_titulaires');
if (idx === -1) {
  console.log('ids_titulaires introuvable.');
  process.exit(0);
}

// Remonte jusqu'au début de l'attribut HTML porteur (le dernier `="` avant idx)
const before = html.slice(Math.max(0, idx - 4000), idx);
const attrStart = before.lastIndexOf('="');
const tagStart = before.lastIndexOf('<');
console.log('\n=== Début de balise/attribut (jusqu\'à 300 caractères avant l\'attribut) ===');
console.log(before.slice(Math.max(0, tagStart - 50), tagStart + 300));

console.log('\n=== 200 caractères juste avant "ids_titulaires" ===');
console.log(before.slice(-200));

console.log('\n=== 1500 caractères à partir de "ids_titulaires" ===');
console.log(html.slice(idx, idx + 1500));

// Cherche aussi une éventuelle occurrence de "but" (pluriel "buts") à
// proximité, HTML-décodée en clair, pour voir si le format diffère des
// cartons.
const decoded = html
  .replace(/&quot;/g, '"')
  .replace(/&amp;/g, '&');
const butIdx = decoded.indexOf('"buts"');
console.log(`\nIndex de "buts" (JSON décodé) : ${butIdx}`);
if (butIdx !== -1) {
  console.log(decoded.slice(Math.max(0, butIdx - 200), butIdx + 800));
}
const buteurIdx = decoded.search(/"buteur/i);
console.log(`\nIndex de "buteur..." (JSON décodé) : ${buteurIdx}`);
if (buteurIdx !== -1) {
  console.log(decoded.slice(Math.max(0, buteurIdx - 200), buteurIdx + 800));
}
