// Diagnostic lecture seule : le diagnostic précédent a montré que la page
// de match Hyères vs Limonest (groupe C) contient bien un objet
// "specifics", mais SANS guillemets autour de la clé (specifics:{...} et
// non "specifics":{...}), et avec des valeurs qui semblent être des
// références à des variables à une lettre (ex: nom:a, type:A) plutôt que
// des littéraux JSON classiques. Ce diagnostic examine la structure
// générale de la page (Next.js flight data / self.__next_f.push) pour
// comprendre le vrai format et si une autre page (qui fonctionne, ex.
// Racing groupe A) utilise un format différent.
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

async function inspecter(label, url) {
  console.log(`\n========== ${label} ==========`);
  console.log(url);
  const res = await fetchAvecTimeout(url);
  console.log(`Statut : ${res.status}`);
  const html = await res.text();
  const decoded = html.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  console.log(`Taille : ${decoded.length}`);
  console.log(`Contient '"specifics"' (avec guillemets) : ${decoded.includes('"specifics"')}`);
  console.log(`Contient 'specifics:{' (sans guillemets) : ${decoded.includes('specifics:{')}`);
  console.log(`Contient '__next_f.push' : ${decoded.includes('__next_f.push')}`);
  console.log(`Contient 'application/json' : ${decoded.includes('application/json')}`);

  // Cherche tous les scripts inline et affiche leur type + taille, pour
  // localiser où vit vraiment le bloc specifics.
  const scriptRe = /<script([^>]*)>([\s\S]*?)<\/script>/g;
  let m, i = 0, nbAvecSpecifics = 0;
  while ((m = scriptRe.exec(decoded)) !== null) {
    i++;
    const attrs = m[1];
    const body = m[2];
    if (body.includes('specifics')) {
      nbAvecSpecifics++;
      const typeMatch = attrs.match(/type="([^"]*)"/);
      const idMatch = attrs.match(/id="([^"]*)"/);
      console.log(`  Script #${i} type=${typeMatch ? typeMatch[1] : '(défaut)'} id=${idMatch ? idMatch[1] : '(aucun)'} taille=${body.length}`);
      // Affiche le tout début de ce script pour voir sa vraie syntaxe.
      console.log(`    Début : ${body.slice(0, 200).replace(/\s+/g, ' ')}`);
      const idxSpec = body.indexOf('specifics');
      console.log(`    Autour de "specifics" (300 avant) : ${body.slice(Math.max(0, idxSpec - 300), idxSpec).replace(/\s+/g, ' ')}`);
    }
  }
  console.log(`${i} balise(s) <script> au total, ${nbAvecSpecifics} contenant "specifics".`);
}

await inspecter('Hyères vs Limonest (groupe C, ÉCHEC)', 'https://www.lequipe.fr/Football/match-direct/national-1-groupe-c/2026-2027/hyeres-limonest-live/696958');

// Récupère la vraie URL du match Racing (groupe A, connu comme
// fonctionnant) au lieu de la deviner, en re-scrapant la page groupe A.
import * as cheerio from 'cheerio';
const urlGroupeA = 'https://www.lequipe.fr/Football/national-1-groupe-a/page-calendrier-resultats/1re-journee';
const resA = await fetchAvecTimeout(urlGroupeA);
const htmlA = await resA.text();
const $a = cheerio.load(htmlA);
let urlRacing = null;
$a('.TeamScore').each((i, el) => {
  const $el = $a(el);
  const home = $el.find('.TeamScore__team--home').first().text().trim() || null;
  const away = $el.find('.TeamScore__team').filter((j, t) => !$a(t).hasClass('TeamScore__team--home')).first().text().trim() || null;
  if (!home || !away) return;
  if (!/racing/i.test(home) && !/racing/i.test(away)) return;
  let $ancestor = $el, href = null;
  for (let depth = 0; depth < 6 && !href; depth++) {
    $ancestor = $ancestor.parent();
    if (!$ancestor.length) break;
    const $link = $ancestor.is('a[href*="match-direct"]') ? $ancestor : $ancestor.find('a[href*="match-direct"]').first();
    if ($link.length) href = $link.attr('href');
  }
  if (href) urlRacing = new URL(href, urlGroupeA).toString();
});
if (urlRacing) await inspecter('Racing (groupe A, RÉUSSITE connue)', urlRacing);
else console.log('\nMatch Racing introuvable sur la page groupe A.');
