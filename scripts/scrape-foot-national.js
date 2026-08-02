// Phase 1 : vérifie qu'on peut atteindre foot-national.com depuis GitHub
// Actions (impossible à tester depuis l'environnement de dev) et inspecte
// la structure réelle de la page avant d'écrire le vrai parseur.
// N'écrit rien en base — se contente de logguer + sauvegarder le HTML brut.
import * as cheerio from 'cheerio';
import { writeFile, mkdir } from 'node:fs/promises';

const targetUrl = process.env.TARGET_URL;

if (!targetUrl) {
  console.error('TARGET_URL manquant (variable d\'environnement).');
  process.exit(1);
}

console.log(`Récupération de ${targetUrl}...`);

const res = await fetch(targetUrl, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language': 'fr-FR,fr;q=0.9',
  },
});

console.log(`Statut HTTP : ${res.status}`);
console.log(`URL finale (après redirections) : ${res.url}`);

if (!res.ok) {
  console.error(`Échec : le site a répondu ${res.status}.`);
  process.exit(1);
}

// fetch() ne respecte pas toujours le charset déclaré dans le Content-Type
// pour le décodage automatique — beaucoup de vieux sites français (dont
// celui-ci) servent de l'ISO-8859-1/Windows-1252, pas de l'UTF-8. On décode
// donc manuellement en se basant sur l'en-tête, avec un repli raisonnable.
const buffer = await res.arrayBuffer();
const contentType = res.headers.get('content-type') || '';
const charsetMatch = contentType.match(/charset=([^;]+)/i);
const charset = (charsetMatch ? charsetMatch[1].trim().toLowerCase() : 'iso-8859-1');
console.log(`Content-Type : ${contentType || '(absent)'} → charset utilisé : ${charset}`);

let html;
try {
  html = new TextDecoder(charset).decode(buffer);
} catch (e) {
  console.warn(`Charset "${charset}" non reconnu par TextDecoder, repli sur iso-8859-1.`);
  html = new TextDecoder('iso-8859-1').decode(buffer);
}

console.log(`Taille de la réponse : ${html.length} caractères`);

const $ = cheerio.load(html);
console.log(`Titre de la page : ${$('title').text().trim()}`);

const bodyText = $('body').text().replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();

// Repère les motifs de score (ex: "2 - 1") et affiche le texte autour de
// chacun, pour voir à quoi ressemble une ligne de résultat sans avoir à
// parcourir tout le menu de navigation qui précède le contenu utile.
// (Découpage par index plutôt que par regex à largeur fixe : bodyText
// contient de vrais retours à la ligne, que "." ne traverse pas.)
const scoreRegex = /\d{1,2}\s*-\s*\d{1,2}/g;
const contexts = [];
let match;
while ((match = scoreRegex.exec(bodyText)) !== null) {
  const start = Math.max(0, match.index - 60);
  const end = Math.min(bodyText.length, match.index + match[0].length + 60);
  contexts.push(bodyText.slice(start, end));
}
console.log(`Motifs ressemblant à un score détectés : ${contexts.length}`);
console.log('--- Contexte autour de chaque motif de score ---');
contexts.forEach((c, i) => console.log(`[${i}] ...${c.replace(/\s+/g, ' ').trim()}...`));
console.log('--- Fin ---');

// Le téléchargement de l'artefact n'est pas possible depuis cette session
// de dev (réseau restreint) — on imprime donc directement dans les logs le
// HTML de l'élément parent de chaque score trouvé, pour voir la vraie
// structure (balises, classes CSS) sans avoir besoin de télécharger quoi
// que ce soit.
const scoreTextNodes = $('*').contents().filter(function () {
  return this.type === 'text' && /\d{1,2}\s*-\s*\d{1,2}/.test($(this).text());
});
console.log(`--- HTML du parent de chaque nœud texte contenant un score (max 5) ---`);
scoreTextNodes.slice(0, 5).each(function (i) {
  const parent = $(this).parent();
  console.log(`[parent ${i}] <${parent.prop('tagName')}> class="${parent.attr('class') || ''}"`);
  console.log($.html(parent));
  console.log('---');
});

// Sauvegarde le HTML brut (décodé) comme artefact pour inspection manuelle
// de la structure réelle (tableaux, classes CSS) avant d'écrire le parseur.
await mkdir('output', { recursive: true });
await writeFile('output/page.html', html, 'utf-8');
console.log('HTML sauvegardé dans output/page.html (uploadé comme artefact).');
