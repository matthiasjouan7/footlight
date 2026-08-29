// Diagnostic lecture seule (aucun accès Supabase) : l'utilisateur signale
// qu'un score est affiché pour "Limonest vs UF Touraine" (date_match
// calculée = 2026-08-28, calendrier_officiel id=3175) alors que le match
// n'aurait pas eu lieu. Vérifie directement sur lequipe.fr : quel lien
// match-direct est associé à cette rencontre sur la page journée 2, et ce
// que la page de ce match affiche réellement (titre, statut, score).
const TARGET_URL = 'https://www.lequipe.fr/Football/national-1-groupe-c/page-calendrier-resultats';
const JOURNEE = 2;

function ordinalJournee(n) { return n === 1 ? '1re-journee' : `${n}e-journee`; }

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
  const url = `${TARGET_URL}/${ordinalJournee(JOURNEE)}`;
  console.log(`URL journée ${JOURNEE} : ${url}`);
  const res = await fetchAvecTimeout(url);
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
    let $ancestor = $el;
    let href = null;
    for (let depth = 0; depth < 6 && !href; depth++) {
      $ancestor = $ancestor.parent();
      if (!$ancestor.length) break;
      const $link = $ancestor.is('a[href*="match-direct"]') ? $ancestor : $ancestor.find('a[href*="match-direct"]').first();
      if ($link.length) href = $link.attr('href');
    }
    rencontres.push({ home, away, href: href ? new URL(href, url).toString() : null });
  });

  console.log(`\n${rencontres.length} rencontre(s) trouvée(s) sur la page journée ${JOURNEE} :`);
  for (const r of rencontres) console.log(`  "${r.home}" vs "${r.away}" -> ${r.href}`);

  const cible = rencontres.find((r) => /limonest/i.test(r.home) || /limonest/i.test(r.away));
  if (!cible) { console.log('\nAucune rencontre Limonest trouvée sur cette page.'); return; }
  console.log(`\nRencontre ciblée : "${cible.home}" vs "${cible.away}" -> ${cible.href}`);
  if (!cible.href) { console.log('Pas de lien match-direct associé.'); return; }

  const resMatch = await fetchAvecTimeout(cible.href);
  if (!resMatch.ok) { console.log(`Échec chargement page match (${resMatch.status}).`); return; }
  const htmlMatch = await resMatch.text();
  const $m = cheerio.load(htmlMatch);
  console.log(`\nTitre page match : ${$m('title').text().trim()}`);
  console.log(`URL finale (après redirection éventuelle) : ${resMatch.url}`);
  const texteScore = $m('.TeamScore__score--ended').first().text().trim();
  console.log(`Texte ".TeamScore__score--ended" : "${texteScore}"`);
  const statut = $m('.TeamScore__status, .MatchStatus, [class*="status" i]').first().text().trim();
  console.log(`Texte statut détecté : "${statut}"`);
  const dateLabel = $m('.caption.caption--small').first().text().trim();
  console.log(`Légende date détectée : "${dateLabel}"`);
}

main().catch((e) => { console.error('Erreur :', e.message); process.exitCode = 1; });
