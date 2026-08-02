// Inspecte la page lequipe.fr pour trouver la source de données la plus
// fiable à parser : un bloc <script type="application/ld+json"> (JSON
// valide, standard SEO) est bien préférable à un objet JS minifié.
import * as cheerio from 'cheerio';

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
console.log(`Taille : ${html.length} caractères`);

const $ = cheerio.load(html);

const ldJsonScripts = $('script[type="application/ld+json"]');
console.log(`Blocs application/ld+json trouvés : ${ldJsonScripts.length}`);
ldJsonScripts.each(function (i) {
  const content = $(this).html();
  console.log(`--- ld+json [${i}] (${content.length} caractères) ---`);
  try {
    const parsed = JSON.parse(content);
    console.log(JSON.stringify(parsed, null, 2).slice(0, 3000));
  } catch (e) {
    console.log('(non parseable) extrait: ' + content.slice(0, 500));
  }
  console.log('---');
});

// Cherche aussi un éventuel __NEXT_DATA__ (Next.js) : JSON valide complet.
const nextData = $('#__NEXT_DATA__').html();
if (nextData) {
  console.log(`__NEXT_DATA__ trouvé, ${nextData.length} caractères.`);
  try {
    const parsed = JSON.parse(nextData);
    console.log('Clés de premier niveau : ' + Object.keys(parsed).join(', '));
  } catch (e) {
    console.log('__NEXT_DATA__ non parseable en JSON.');
  }
} else {
  console.log('Pas de __NEXT_DATA__.');
}

// Cherche le mot "score" dans le texte brut pour voir s'il y a des scores
// quelque part sur la page (calendrier à venir vs résultats déjà joués).
const scoreIdx = html.search(/score/i);
if (scoreIdx >= 0) {
  console.log('--- Contexte autour de "score" ---');
  console.log(html.slice(Math.max(0, scoreIdx - 100), scoreIdx + 300));
} else {
  console.log('Aucune occurrence de "score" dans le HTML.');
}
