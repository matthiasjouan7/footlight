// Diagnostic lecture seule : la page de match Hyères vs Limonest n'a
// AUCUN bloc "specifics" JSON valide (seulement une version non-JSON avec
// clés sans guillemets et valeurs = références de variables) — confirmé
// par diagnostic-toutes-occurrences-specifics.js (2 occurrences, toutes
// deux non-guillemetées, contre 78 pour un match qui fonctionne). Avant de
// conclure à une donnée manquante côté lequipe.fr, vérifie s'il existe
// AILLEURS sur la page un score simple (quoted JSON), séparé du détail
// des événements, qui permettrait au moins de renseigner le score du
// match sans le détail individuel (buts/cartons/minutes par joueur).
const HEADERS_LEQUIPE = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'fr-FR,fr;q=0.9',
};
async function fetchAvecTimeout(url, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(url, { headers: HEADERS_LEQUIPE, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}

const url = 'https://www.lequipe.fr/Football/match-direct/national-1-groupe-c/2026-2027/hyeres-limonest-live/696958';
const res = await fetchAvecTimeout(url);
const html = await res.text();
const decoded = html.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

// Cherche tous les motifs plausibles de score quoté JSON.
const motifs = [
  /"score_domicile"\s*:\s*\d+/g,
  /"score_exterieur"\s*:\s*\d+/g,
  /"scoreDomicile"\s*:\s*\d+/g,
  /"scoreExterieur"\s*:\s*\d+/g,
  /"score"\s*:\s*"[^"]*"/g,
  /"buts_domicile"\s*:\s*\d+/g,
  /"buts_exterieur"\s*:\s*\d+/g,
  /"resultat"\s*:\s*"[^"]*"/g,
  /"is_terminee?"\s*:\s*(true|false)/g,
  /"termine[e]?"\s*:\s*(true|false)/g,
];
for (const re of motifs) {
  const matches = [...decoded.matchAll(re)];
  console.log(`${re} : ${matches.length} occurrence(s)${matches.length ? ' — ex: ' + matches.slice(0, 3).map((m) => m[0]).join(' | ') : ''}`);
}

// Cherche aussi le texte affiché du score dans le DOM (ex: <span class="Score...">1 - 1</span>)
import * as cheerio from 'cheerio';
const $ = cheerio.load(decoded);
$('[class*="Score"]').slice(0, 20).each((i, el) => {
  const txt = $(el).text().trim();
  if (txt) console.log(`DOM [class*="Score"] #${i} (${$(el).attr('class')}) : "${txt}"`);
});
