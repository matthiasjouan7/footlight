// Diagnostic lecture seule : le workflow quotidien
// sync-lequipe-match-stats-scheduled.yml échoue depuis plusieurs jours pour
// (quasiment) toutes les compétitions (N1 groupes A/B/C, Ligue 3, N2 A-H)
// avec l'erreur "Impossible de déterminer la compétition depuis <url> —
// abandon." (sync-lequipe-match-stats-auto.js, via detecterCompetition()
// dans lib-sync-lequipe-match-stats.js). L'échec survient en ~200ms, donc
// probablement pas un simple timeout réseau : soit la page lequipe.fr a
// changé de structure (JSON-LD BreadcrumbList / <title>), soit la réponse
// n'est plus ok (redirection, blocage).
//
// Ce script reproduit exactement la requête de detecterCompetition() pour
// quelques URLs (N1 groupe A, N2 groupe D — qui a réussi le 22/09 —, et
// Ligue 3) et affiche le statut HTTP, le <title>, et le contenu JSON-LD
// brut, sans rien écrire nulle part.
import * as cheerio from 'cheerio';

const HEADERS_LEQUIPE = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'fr-FR,fr;q=0.9',
};

const URLS = [
  'https://www.lequipe.fr/Football/national-1-groupe-a/page-calendrier-resultats',
  'https://www.lequipe.fr/Football/national-1-groupe-a/page-calendrier-resultats',
  'https://www.lequipe.fr/Football/national-1-groupe-b/page-calendrier-resultats',
  'https://www.lequipe.fr/Football/national-1-groupe-c/page-calendrier-resultats',
  'https://www.lequipe.fr/Football/national-2-groupe-d/page-calendrier-resultats',
];

for (const url of URLS) {
  console.log(`\n========== ${url} ==========`);
  let res;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    res = await fetch(url, { headers: HEADERS_LEQUIPE, signal: controller.signal });
    clearTimeout(timer);
  } catch (err) {
    console.log(`Échec fetch : ${err.name === 'AbortError' ? 'timeout' : err.message}`);
    continue;
  }
  console.log(`Statut HTTP : ${res.status} ${res.statusText} — redirigé : ${res.redirected} — url finale : ${res.url}`);
  if (!res.ok) {
    const corpsErreur = await res.text().catch(() => '');
    console.log(`Réponse non-ok, detecterCompetition() retourne null ici. Corps (300 premiers car.) : ${corpsErreur.slice(0, 300).replace(/\s+/g, ' ')}`);
    continue;
  }
  const html = await res.text();
  console.log(`Taille HTML reçue : ${html.length} caractères.`);
  const $ = cheerio.load(html);
  const pageTitle = $('title').text().trim();
  console.log(`<title> : "${pageTitle}"`);
  const scripts = $('script[type="application/ld+json"]');
  console.log(`${scripts.length} script(s) ld+json trouvé(s).`);
  const jsonLds = scripts.map((i, el) => { try { return JSON.parse($(el).html()); } catch (e) { return { erreurParse: e.message }; } }).get();
  const breadcrumb = jsonLds.find((j) => j && j['@type'] === 'BreadcrumbList');
  console.log(`BreadcrumbList trouvé : ${!!breadcrumb}`);
  if (breadcrumb) {
    console.log(`Dernier item du breadcrumb : ${JSON.stringify(breadcrumb.itemListElement?.at(-1)?.item)}`);
  } else {
    console.log(`Types ld+json présents : ${jsonLds.map((j) => j?.['@type'] || j?.erreurParse || 'inconnu').join(', ')}`);
  }
}
