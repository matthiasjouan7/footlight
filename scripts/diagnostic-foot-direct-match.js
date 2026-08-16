// Diagnostic en lecture seule (aucune écriture) : inspecte la structure
// d'une page match foot-direct.com pour voir si le passeur d'un but y est
// indiqué (contrairement à L'Équipe, vérifié absent via
// diagnostic-lequipe-specifics.js).
import * as cheerio from 'cheerio';

const targetUrl = process.env.TARGET_URL;
if (!targetUrl) { console.error('TARGET_URL manquant.'); process.exit(1); }

const res = await fetch(targetUrl, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language': 'fr-FR,fr;q=0.9',
  },
});
console.log(`Statut : ${res.status}`);
if (!res.ok) { console.error('Échec chargement.'); process.exit(1); }
const html = await res.text();
console.log(`Taille HTML : ${html.length} caractères`);
const $ = cheerio.load(html);
console.log(`Titre : ${$('title').text().trim()}`);

// Mots-clés pertinents : but, passe, assist, score, minute.
const motsCles = ['but', 'passe decisive', 'assist', 'score', 'buteur', 'passeur'];
for (const mot of motsCles) {
  const n = html.toLowerCase().split(mot.toLowerCase()).length - 1;
  console.log(`Occurrences de "${mot}" dans le HTML brut : ${n}`);
}

console.log(`\nNombre de <table> : ${$('table').length}`);
$('table').each((i, table) => {
  const $table = $(table);
  console.log(`\n--- Table #${i} (class="${$table.attr('class') || ''}") ---`);
  $table.find('tr').slice(0, 10).each((j, tr) => {
    const cells = $(tr).find('td,th').map((k, td) => $(td).text().trim().replace(/\s+/g, ' ')).get();
    console.log(`  row ${j}: [${cells.join(' | ')}]`);
  });
});

// Cherche des conteneurs d'événements de match (buts, cartons) par motifs
// de classe courants.
const candidats = ['[class*="event"]', '[class*="incident"]', '[class*="goal"]', '[class*="but"]', '[class*="timeline"]', '[class*="minute"]'];
console.log('\n--- Conteneurs candidats pour les événements de match ---');
for (const sel of candidats) {
  const els = $(sel);
  if (els.length > 0) {
    console.log(`\n${sel} : ${els.length} élément(s)`);
    els.slice(0, 6).each((i, el) => {
      console.log(`  [${i}] "${$(el).text().trim().replace(/\s+/g, ' ').slice(0, 150)}"`);
    });
  }
}

// Cherche un éventuel JSON embarqué (Next.js __NEXT_DATA__, Nuxt, etc.)
const scriptsJson = $('script[type="application/json"], #__NEXT_DATA__, script#__NUXT_DATA__');
console.log(`\n--- Scripts JSON embarqués : ${scriptsJson.length} ---`);
scriptsJson.each((i, el) => {
  const id = $(el).attr('id') || '(sans id)';
  const contenu = $(el).html() || '';
  console.log(`  [${i}] id="${id}", longueur=${contenu.length}`);
});
