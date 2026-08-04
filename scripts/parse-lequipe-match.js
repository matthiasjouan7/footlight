// Extraction (lecture seule) des buts/cartons d'une page match-direct de
// lequipe.fr. Les données vivent dans un attribut HTML au format JSON
// encodé en entités HTML (&quot;), sous une clé "specifics" contenant
// {domicile: {buts, cartons, ...}, exterieur: {buts, cartons, ...}}.
import * as cheerio from 'cheerio';

const targetUrl = process.env.TARGET_URL;
if (!targetUrl) {
  console.error('TARGET_URL manquant.');
  process.exit(1);
}

const res = await fetch(targetUrl, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language': 'fr-FR,fr;q=0.9',
  },
});
if (!res.ok) {
  console.error(`Échec : statut ${res.status}`);
  process.exit(1);
}
const html = await res.text();

const decoded = html
  .replace(/&quot;/g, '"')
  .replace(/&#x27;/g, "'")
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>');

function extractBalancedObject(text, keyPattern) {
  const m = text.match(keyPattern);
  if (!m) return null;
  const start = m.index + m[0].length - 1; // position du '{' ouvrant
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (escaped) { escaped = false; }
      else if (c === '\\') { escaped = true; }
      else if (c === '"') { inString = false; }
      continue;
    }
    if (c === '"') { inString = true; continue; }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

const specificsRaw = extractBalancedObject(decoded, /"specifics"\s*:\s*\{/);
if (!specificsRaw) {
  console.error('Objet "specifics" introuvable dans la page.');
  process.exit(1);
}

let specifics;
try {
  specifics = JSON.parse(specificsRaw);
} catch (e) {
  console.error('Échec du JSON.parse sur "specifics" :', e.message);
  console.log(specificsRaw.slice(0, 2000));
  process.exit(1);
}

const $ = cheerio.load(html);
const equipeDomicile = $('.TeamScore__team--home').first().text().trim() || null;
const equipeExterieur = $('.TeamScore__team')
  .filter((i, el) => !$(el).hasClass('TeamScore__team--home'))
  .first().text().trim() || null;

function extraireEvenements(side, label) {
  const buts = (side?.buts || []).map((b) => ({
    equipe: label,
    minute: b.instant?.libelle || null,
    minute_num: b.instant?.date ? parseInt(b.instant.date, 10) : null,
    joueur_nom_complet: b.joueur?.nom_complet || null,
    joueur_nom_abrege: b.joueur?.nom_abrege || null,
    joueur_id: b.joueur?.id || null,
    type: b.type || null,
  }));
  const cartons = (side?.cartons || []).map((c) => ({
    equipe: label,
    minute: c.instant?.libelle || null,
    minute_num: c.instant?.date ? parseInt(c.instant.date, 10) : null,
    joueur_nom_complet: c.joueur?.nom_complet || null,
    joueur_nom_abrege: c.joueur?.nom_abrege || null,
    joueur_id: c.joueur?.id || null,
    type: c.type || null,
  }));
  return { buts, cartons };
}

const domicile = extraireEvenements(specifics.domicile, 'domicile');
const exterieur = extraireEvenements(specifics.exterieur, 'exterieur');

const resultat = {
  source_url: targetUrl,
  equipe_domicile: equipeDomicile,
  equipe_exterieur: equipeExterieur,
  buts: [...domicile.buts, ...exterieur.buts],
  cartons: [...domicile.cartons, ...exterieur.cartons],
};

console.log(JSON.stringify(resultat, null, 2));
console.log(`\n${resultat.buts.length} but(s), ${resultat.cartons.length} carton(s) extrait(s).`);

// Exemple brut d'un carton (structure complète) pour vérifier les champs
// disponibles (ex: couleur du carton) avant de construire la logique de
// rapprochement avec les joueurs FootLight.
if (specifics.domicile?.cartons?.[0]) {
  console.log('\n=== Exemple brut de carton (domicile) ===');
  console.log(JSON.stringify(specifics.domicile.cartons[0], null, 2));
} else if (specifics.exterieur?.cartons?.[0]) {
  console.log('\n=== Exemple brut de carton (exterieur) ===');
  console.log(JSON.stringify(specifics.exterieur.cartons[0], null, 2));
} else {
  console.log('\n(Aucun carton dans ce match pour voir un exemple de structure.)');
}
