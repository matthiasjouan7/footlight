// Diagnostic lecture seule (aucune écriture, aucun accès Supabase) :
// vérifie l'ampleur du bug découvert sur "Limonest vs UF Touraine" (tous
// les matchs d'une page journée pointent vers le même lien match-direct).
// Compare l'ordre DOM des blocs .TeamScore à l'ordre DOM des liens
// a[href*="match-direct"] présents sur la page, pour voir si un simple
// appariement par index (au lieu de la remontée d'ancêtres actuelle)
// donnerait un lien différent (donc correct) pour chaque match.
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
  const $ = cheerio.load(html);

  // Ordre DOM des matchs (home/away)
  const matchs = [];
  $('.TeamScore').each((i, el) => {
    const $el = $(el);
    const home = $el.find('.TeamScore__team--home').first().text().trim() || null;
    const away = $el.find('.TeamScore__team').filter((j, t) => !$(t).hasClass('TeamScore__team--home')).first().text().trim() || null;
    if (home && away) matchs.push({ home, away });
  });
  console.log(`\n${matchs.length} bloc(s) .TeamScore (home vs away) dans l'ordre DOM :`);
  matchs.forEach((m, i) => console.log(`  [${i}] "${m.home}" vs "${m.away}"`));

  // Ordre DOM de tous les liens match-direct présents sur la page (uniques, dans l'ordre d'apparition)
  const hrefsVus = new Set();
  const hrefsOrdre = [];
  $('a[href*="match-direct"]').each((i, el) => {
    const href = $(el).attr('href');
    if (href && !hrefsVus.has(href)) { hrefsVus.add(href); hrefsOrdre.push(href); }
  });
  console.log(`\n${hrefsOrdre.length} lien(s) match-direct unique(s) dans l'ordre DOM :`);
  hrefsOrdre.forEach((h, i) => console.log(`  [${i}] ${h}`));

  console.log(`\n=== Comparaison ===`);
  console.log(`${matchs.length} match(s) détecté(s) vs ${hrefsOrdre.length} lien(s) unique(s) détecté(s).`);
  if (matchs.length === hrefsOrdre.length) {
    console.log('Même nombre : un appariement par index (ordre DOM) donnerait probablement un lien distinct et correct par match. Aperçu :');
    matchs.forEach((m, i) => console.log(`  "${m.home}" vs "${m.away}" -> ${hrefsOrdre[i]}`));
  } else {
    console.log('Nombre différent : un simple appariement par index ne suffit pas tel quel, il faut analyser plus finement le HTML autour de chaque match-direct pour en extraire les 2 équipes (ex: attribut title, texte du lien, ou slug de l\'URL).');
  }
}

main().catch((e) => { console.error('Erreur :', e.message); process.exitCode = 1; });
