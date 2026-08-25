// Diagnostic lecture seule : la synchro groupe B (Lorient/Chauray/Briochin)
// a trouvé "8 rencontre(s) avec lien match-direct" mais "0 joueur(s)
// FootLight lié(s) examiné(s)" — alors que groupe A a bien fonctionné
// (207 examinés). Hypothèse : le script ne capture qu'UNE seule date
// (première légende ".caption.caption--small" contenant un jour de la
// semaine) pour toute la journée, alors que les matchs peuvent être
// étalés sur plusieurs jours (vendredi/samedi/dimanche) — la requête
// calendrier_officiel filtrée sur cette date unique ne retrouve alors
// aucune ligne. Reproduit fidèlement l'extraction de
// lib-sync-lequipe-match-stats.js sur la vraie page groupe B journée 1,
// et affiche TOUTES les légendes de date trouvées sur la page (pas
// seulement la première).
import * as cheerio from 'cheerio';

const HEADERS_LEQUIPE = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'fr-FR,fr;q=0.9',
};

const URL_JOURNEE1 = 'https://www.lequipe.fr/Football/national-1-groupe-b/page-calendrier-resultats/1re-journee';

const res = await fetch(URL_JOURNEE1, { headers: HEADERS_LEQUIPE });
console.log(`Statut HTTP : ${res.status}`);
const html = await res.text();
const $ = cheerio.load(html);

const captions = $('.caption.caption--small').filter((i, el) => /lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche/i.test($(el).text()));
console.log(`\n${captions.length} légende(s) de date trouvée(s) sur la page :`);
captions.each((i, el) => console.log(`  [${i}] "${$(el).text().trim()}"`));

console.log(`\nPremière légende retenue par le script actuel : "${captions.first().text().trim()}"`);

const rencontres = [];
$('.TeamScore').each((i, el) => {
  const $el = $(el);
  const home = $el.find('.TeamScore__team--home').first().text().trim() || null;
  const away = $el.find('.TeamScore__team').filter((j, t) => !$(t).hasClass('TeamScore__team--home')).first().text().trim() || null;
  if (home && away) rencontres.push(`${home} vs ${away}`);
});
console.log(`\n${rencontres.length} rencontre(s) trouvée(s) sur la page :`);
rencontres.forEach((r) => console.log(`  ${r}`));
