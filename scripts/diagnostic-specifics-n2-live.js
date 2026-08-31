// Diagnostic lecture seule (aucun accès Supabase) : 100% des joueurs N2
// sont à matchs_joues=0. Hypothèse : lequipe.fr ne fournit jamais de
// bloc "specifics" (feuille de match détaillée) pour ce niveau de
// compétition, contrairement à National 1 où certains matchs en ont
// (ex: Troyes B vs Istres). Vérifie en direct sur 2-3 matchs réels de la
// journée 1 National 2 groupe A si un lien match-direct individuel et un
// bloc "specifics" existent.
const TARGET_URL = 'https://www.lequipe.fr/Football/national-2-groupe-a/page-calendrier-resultats';

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
  const $ = cheerio.load(html);
  console.log(`Titre page : ${$('title').text().trim()}`);

  const rencontres = [];
  $('.TeamScore').each((i, el) => {
    const $el = $(el);
    const home = $el.find('.TeamScore__team--home').first().text().trim() || null;
    const away = $el.find('.TeamScore__team').filter((j, t) => !$(t).hasClass('TeamScore__team--home')).first().text().trim() || null;
    if (!home || !away) return;
    let $ancestor = $el, href = null;
    for (let depth = 0; depth < 6 && !href; depth++) {
      $ancestor = $ancestor.parent();
      if (!$ancestor.length) break;
      const $link = $ancestor.is('a[href*="match-direct"]') ? $ancestor : $ancestor.find('a[href*="match-direct"]').first();
      if ($link.length) href = $link.attr('href');
    }
    rencontres.push({ home, away, href: href ? new URL(href, TARGET_URL).toString() : null });
  });
  console.log(`\n${rencontres.length} rencontre(s) trouvée(s) :`);
  for (const r of rencontres) console.log(`  "${r.home}" vs "${r.away}" -> ${r.href}`);

  const hrefsUniques = new Set(rencontres.map((r) => r.href).filter(Boolean));
  console.log(`\n${hrefsUniques.size} lien(s) match-direct unique(s) parmi ${rencontres.length} rencontres.`);

  for (const href of [...hrefsUniques]) {
    const resMatch = await fetchAvecTimeout(href);
    if (!resMatch.ok) { console.log(`\n${href} : échec (${resMatch.status})`); continue; }
    const htmlMatch = await resMatch.text();
    const decoded = htmlMatch.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
    const aSpecifics = /"specifics"\s*:\s*\{/.test(decoded);
    const $m = cheerio.load(htmlMatch);
    console.log(`\n${href}`);
    console.log(`  Titre : ${$m('title').text().trim()}`);
    console.log(`  Bloc "specifics" présent : ${aSpecifics ? 'OUI' : 'NON'}`);
  }
}

main().catch((e) => { console.error('Erreur :', e.message); process.exitCode = 1; });
