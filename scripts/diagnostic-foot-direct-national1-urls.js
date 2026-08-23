// Diagnostic lecture seule : teste plusieurs URLs candidates pour les
// groupes de National 1 sur foot-direct.com (le slug exact n'est pas
// connu — celui de Ligue 3 est "/france/ligue-3/", lequipe.fr utilise
// "national-1-groupe-a/b/c"). Affiche statut HTTP, titre de page et
// nombre de liens de match trouvés pour chaque candidate, avant de
// câbler l'automatisation sur la bonne URL.
import * as cheerio from 'cheerio';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'fr-FR,fr;q=0.9',
};

const CANDIDATS = [
  'https://www.foot-direct.com/france/national-1/',
  'https://www.foot-direct.com/france/national-1-groupe-a/',
  'https://www.foot-direct.com/france/national-1-groupe-b/',
  'https://www.foot-direct.com/france/national-1-groupe-c/',
  'https://www.foot-direct.com/france/national-1-a/',
  'https://www.foot-direct.com/france/national-1-b/',
  'https://www.foot-direct.com/france/national-1-c/',
  'https://www.foot-direct.com/france/national/',
];

for (const url of CANDIDATS) {
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) { console.log(`${url} -> statut ${res.status}`); continue; }
    const html = await res.text();
    const $ = cheerio.load(html);
    const titre = $('title').text().trim();
    const nbLiensMatch = new Set(
      $('a[href*="/live/"]').map((i, el) => $(el).attr('href')).get().filter((h) => /\/live\/\d+-/.test(h))
    ).size;
    console.log(`${url} -> statut ${res.status} | titre: "${titre}" | ${nbLiensMatch} lien(s) de match`);
  } catch (err) {
    console.log(`${url} -> erreur: ${err.message}`);
  }
}
