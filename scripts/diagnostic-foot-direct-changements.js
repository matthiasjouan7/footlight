// Diagnostic en lecture seule (aucune écriture) : sur une page de match
// foot-direct.com, cherche si les CHANGEMENTS (entrées en jeu) sont
// indiqués avec une minute, sur le même principe que les buts ("87' G.
// Morgan (P.D A. Majid)", déjà exploités par sync-foot-direct-passes.js
// via [class*="goal"]). Objectif : savoir si on peut reconstituer le
// score au moment où un remplaçant entre en jeu, pour mesurer l'impact
// réel d'un but/passe décisive en sortie de banc.
import * as cheerio from 'cheerio';

const targetUrl = process.env.TARGET_URL;
if (!targetUrl) { console.error('TARGET_URL manquant.'); process.exit(1); }

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'fr-FR,fr;q=0.9',
};

const res = await fetch(targetUrl, { headers: HEADERS });
console.log(`Statut : ${res.status}`);
if (!res.ok) { console.error('Échec chargement.'); process.exit(1); }
const html = await res.text();
const $ = cheerio.load(html);
console.log(`Titre : ${$('title').text().trim()}`);

// Buts, pour référence (déjà connus fonctionnels).
const buts = $('[class*="goal"]').map((i, el) => $(el).text().trim()).get()
  .filter((t) => /^\d+(\+\d+)?['’]/.test(t));
console.log(`\n--- Buts (${buts.length}) ---`);
buts.forEach((t) => console.log(`  "${t}"`));

// Candidats pour les changements/entrées en jeu.
const candidats = ['[class*="sub"]', '[class*="chang"]', '[class*="substitut"]', '[class*="entree"]', '[class*="in-out"]', '[class*="inout"]'];
console.log('\n--- Conteneurs candidats pour les changements ---');
for (const sel of candidats) {
  const els = $(sel);
  if (els.length > 0) {
    console.log(`\n${sel} : ${els.length} élément(s)`);
    els.slice(0, 15).each((i, el) => {
      console.log(`  [${i}] "${$(el).text().trim().replace(/\s+/g, ' ').slice(0, 200)}"`);
    });
  }
}

// Recherche brute de mots-clés liés aux changements dans tout le HTML.
const motsCles = ['changement', 'remplacement', 'entre en jeu', 'sort', 'substitution', '⇄', '↔'];
console.log('\n--- Occurrences mots-clés (HTML brut, insensible à la casse) ---');
for (const mot of motsCles) {
  const n = html.toLowerCase().split(mot.toLowerCase()).length - 1;
  console.log(`  "${mot}" : ${n}`);
}

// Cherche toute ligne de texte commençant par une minute (comme les buts)
// mais qui n'est PAS dans un élément [class*="goal"], pour repérer où les
// changements pourraient se trouver.
const elementsMinute = $('*').filter((i, el) => {
  const txt = $(el).clone().children().remove().end().text().trim();
  return /^\d+(\+\d+)?['’]/.test(txt) && txt.length < 120;
});
console.log(`\n--- Éléments texte direct commençant par une minute (${elementsMinute.length}, hors sous-éléments) ---`);
elementsMinute.slice(0, 40).each((i, el) => {
  console.log(`  [${i}] class="${$(el).attr('class') || ''}" : "${$(el).clone().children().remove().end().text().trim().replace(/\s+/g, ' ')}"`);
});
