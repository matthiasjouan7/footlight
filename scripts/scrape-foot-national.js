// Phase 1 : vérifie qu'on peut atteindre foot-national.com depuis GitHub
// Actions (impossible à tester depuis l'environnement de dev) et inspecte
// la structure réelle de la page avant d'écrire le vrai parseur.
// N'écrit rien en base — se contente de logguer.
import * as cheerio from 'cheerio';

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

const html = await res.text();
console.log(`Taille de la réponse : ${html.length} caractères`);

const $ = cheerio.load(html);
console.log(`Titre de la page : ${$('title').text().trim()}`);

const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
console.log('--- Extrait du texte visible de la page (4000 premiers caractères) ---');
console.log(bodyText.slice(0, 4000));
console.log('--- Fin de l\'extrait ---');

// Repère grossièrement des motifs de score (ex: "2 - 1", "2-1") pour avoir
// une première idée de la quantité de résultats présents sur la page.
const scoreMatches = bodyText.match(/\d{1,2}\s*-\s*\d{1,2}/g) || [];
console.log(`Motifs ressemblant à un score détectés : ${scoreMatches.length}`);
