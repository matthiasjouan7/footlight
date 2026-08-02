// Teste rapidement une liste d'URLs candidates (une par ligne, ou séparées
// par des virgules) et rapporte pour chacune : statut HTTP + titre de page.
// Sert à découvrir quelles pages existent réellement sur foot-national.com
// (le nombre de groupes par championnat évolue d'une saison à l'autre, donc
// pas question de deviner à l'aveugle sans vérifier).
import * as cheerio from 'cheerio';

const raw = process.env.CANDIDATE_URLS || '';
const urls = raw.split(/[\n,]/).map((u) => u.trim()).filter(Boolean);

if (urls.length === 0) {
  console.error('CANDIDATE_URLS manquant ou vide.');
  process.exit(1);
}

console.log(`${urls.length} URL(s) à tester.\n`);

for (const url of urls) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'fr-FR,fr;q=0.9',
      },
    });

    if (!res.ok) {
      console.log(`[${res.status}] ${url}`);
      continue;
    }

    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get('content-type') || '';
    const charsetMatch = contentType.match(/charset=([^;]+)/i);
    const charset = (charsetMatch ? charsetMatch[1].trim().toLowerCase() : 'iso-8859-1');
    let html;
    try {
      html = new TextDecoder(charset).decode(buffer);
    } catch (e) {
      html = new TextDecoder('iso-8859-1').decode(buffer);
    }

    const $ = cheerio.load(html);
    const title = $('title').text().trim();
    const nbResultRows = $('div.col-sm-7.col-xs-12').length;
    console.log(`[${res.status}] ${url}\n    titre: "${title}"\n    lignes de résultat détectées: ${nbResultRows}`);
  } catch (e) {
    console.log(`[ERREUR] ${url}\n    ${e.message}`);
  }
}
