// Diagnostic lecture seule : le sélecteur a[href*="match-direct"] ne
// trouve qu'un seul lien sur toute la page journée (probablement celui du
// match "en direct"/vedette). Cherche, pour chaque bloc .TeamScore, le
// PREMIER lien <a href> ancêtre ou proche (sans filtrer sur "match-direct"),
// pour découvrir le vrai pattern d'URL utilisé pour les autres matchs
// (résultat déjà joué ou à venir).
const TARGET_URL = process.env.TARGET_URL
  || 'https://www.lequipe.fr/Football/national-1-groupe-c/page-calendrier-resultats/2e-journee';

async function fetchAvecTimeout(url, ms = 15000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0' } });
  } finally {
    clearTimeout(t);
  }
}

async function main() {
  const cheerio = await import('cheerio');
  console.log(`URL : ${TARGET_URL}`);
  const res = await fetchAvecTimeout(TARGET_URL);
  if (!res.ok) { console.error(`Échec chargement : statut ${res.status}`); process.exitCode = 1; return; }
  const html = await res.text();
  console.log(`Taille HTML brut : ${html.length} caractères.`);
  const $ = cheerio.load(html);

  console.log(`\nNombre total d'ancres <a href> sur la page : ${$('a[href]').length}`);
  const hrefsUniques = new Set();
  $('a[href]').each((i, el) => hrefsUniques.add($(el).attr('href')));
  console.log(`Dont ${hrefsUniques.size} href unique(s). Aperçu des 30 premiers :`);
  [...hrefsUniques].slice(0, 30).forEach((h) => console.log(`  ${h}`));

  console.log(`\n=== Pour chaque bloc .TeamScore, plus proche ancêtre <a href> (n'importe lequel) ===`);
  $('.TeamScore').each((i, el) => {
    const $el = $(el);
    const home = $el.find('.TeamScore__team--home').first().text().trim() || '?';
    const away = $el.find('.TeamScore__team').filter((j, t) => !$(t).hasClass('TeamScore__team--home')).first().text().trim() || '?';
    let $ancestor = $el;
    let href = null, depthTrouve = null;
    for (let depth = 0; depth < 8 && !href; depth++) {
      $ancestor = $ancestor.parent();
      if (!$ancestor.length) break;
      if ($ancestor.is('a[href]')) { href = $ancestor.attr('href'); depthTrouve = depth; }
    }
    console.log(`  [${i}] "${home}" vs "${away}" -> ${href ? `${href} (ancêtre direct, profondeur ${depthTrouve})` : '(aucun ancêtre <a> trouvé)'}`);
  });

  // Cherche aussi un éventuel bloc JSON embarqué (Next.js/Nuxt) qui listerait les matchs avec leurs slugs/URLs.
  const scriptsJson = $('script[type="application/json"], script#__NEXT_DATA__, script[id*="data" i]');
  console.log(`\n${scriptsJson.length} script(s) JSON embarqué(s) trouvé(s) (id/type data).`);
  scriptsJson.each((i, el) => {
    const id = $(el).attr('id') || '(sans id)';
    const contenu = $(el).html() || '';
    console.log(`  [${i}] id="${id}" longueur=${contenu.length}`);
  });
}

main().catch((e) => { console.error('Erreur :', e.message); process.exitCode = 1; });
