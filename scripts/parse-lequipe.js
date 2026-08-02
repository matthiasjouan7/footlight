// Parseur définitif pour une page "calendrier-resultats" de lequipe.fr
// (une journée d'un groupe/championnat donné). Extrait les matchs en JSON
// structuré. N'écrit rien en base — c'est la phase suivante (nécessite la
// clé Supabase service_role) qui s'en chargera.
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

if (!res.ok) {
  console.error(`Échec : statut ${res.status}`);
  process.exit(1);
}

const html = await res.text();
const $ = cheerio.load(html);

// Le libellé de compétition/journée vient du sélecteur de journée
// (ex: "30e journée") et du fil d'Ariane (ex: "National 2 groupe a").
const journeeLabel = $('.SelectNav__label').first().text().trim() || null;
const competitionLabel = $('script[type="application/ld+json"]')
  .map((i, el) => {
    try { return JSON.parse($(el).html()); } catch (e) { return null; }
  })
  .get()
  .find((j) => j && j['@type'] === 'BreadcrumbList')
  ?.itemListElement?.at(-1)?.item?.name || null;

// La date de la journée est un texte du type "samedi 16 mai." (sans année) —
// on ne connaît que le jour/mois, pas l'année, car lequipe.fr ne l'affiche
// pas ici. À rapprocher de la saison affichée dans le titre <title> de la
// page (ex: "2025-2026") pour déduire l'année réelle côté appelant.
const dateCaption = $('.caption.caption--small')
  .filter((i, el) => /lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche/i.test($(el).text()))
  .first()
  .text()
  .trim() || null;

const pageTitle = $('title').text().trim();
const saisonMatch = pageTitle.match(/(\d{4})-(\d{4})/);
const saison = saisonMatch ? `${saisonMatch[1]}-${saisonMatch[2]}` : null;

const matchs = [];
$('.TeamScore').each((i, el) => {
  const $match = $(el);
  const home = $match.find('.TeamScore__team--home').first().text().trim() || null;
  // L'équipe extérieure est le seul autre .TeamScore__team sans le
  // modificateur --home.
  const away = $match
    .find('.TeamScore__team')
    .filter((j, teamEl) => !$(teamEl).hasClass('TeamScore__team--home'))
    .first()
    .text()
    .trim() || null;

  const scoreEl = $match.find('.TeamScore__score--ended').first();
  let scoreHome = null, scoreAway = null;
  if (scoreEl.length) {
    const scoreText = scoreEl.text().trim(); // ex: "0-2"
    const scoreParts = scoreText.match(/^(\d+)\s*-\s*(\d+)$/);
    if (scoreParts) {
      scoreHome = parseInt(scoreParts[1], 10);
      scoreAway = parseInt(scoreParts[2], 10);
    }
  }

  if (home && away) {
    matchs.push({ equipe_domicile: home, equipe_exterieur: away, score_domicile: scoreHome, score_exterieur: scoreAway });
  }
});

const resultat = {
  source_url: targetUrl,
  competition: competitionLabel,
  journee: journeeLabel,
  saison,
  date_journee_texte: dateCaption,
  matchs,
};

console.log(JSON.stringify(resultat, null, 2));
console.log(`\n${matchs.length} match(s) extrait(s).`);
