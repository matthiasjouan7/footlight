// Diagnostic lecture seule : le diagnostic précédent n'a montré que la
// PREMIÈRE occurrence de "specifics" dans le script #9 de chaque page.
// Hypothèse à vérifier : ce script contient DEUX occurrences — une
// première non essentielle (config/metadata, sans guillemets), et une
// seconde, celle qui compte réellement (avec guillemets, "specifics":{...},
// contenant les vrais événements du match), présente seulement quand
// L'Équipe a produit une couverture détaillée du match. Si Hyères vs
// Limonest n'a qu'UNE seule occurrence (la config) alors que Racing en a
// DEUX, la vraie cause est un manque de données côté lequipe.fr pour ce
// match précis, pas un bug de code.
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
  const res = await fetchAvecTimeout(url);
  const html = await res.text();
  const decoded = html.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

  // Toutes les occurrences de "specifics" (insensible à la casse) dans la
  // page entière, avec leur contexte immédiat (20 avant, 60 après) pour
  // voir si guillemets ou pas.
  const re = /specifics/gi;
  let m, n = 0;
  while ((m = re.exec(decoded)) !== null) {
    n++;
    const avant = decoded.slice(Math.max(0, m.index - 20), m.index);
    const apres = decoded.slice(m.index, m.index + 60);
    console.log(`  #${n} @${m.index} : ...${avant}[${apres}]...`);
  }
  console.log(`Total occurrences de "specifics" : ${n}`);
}

await inspecter('Hyères vs Limonest (groupe C, ÉCHEC)', 'https://www.lequipe.fr/Football/match-direct/national-1-groupe-c/2026-2027/hyeres-limonest-live/696958');
await inspecter('Racing (groupe A, RÉUSSITE connue)', 'https://www.lequipe.fr/Football/match-direct/national-1-groupe-a/2026-2027/pays-du-valois-racing-cf-live/696248');
