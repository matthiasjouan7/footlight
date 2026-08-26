// Diagnostic lecture seule : pourquoi la page de détail du match Hyères vs
// Limonest (N1 groupe B, journée 1) ne contient jamais l'objet "specifics"
// attendu par lib-sync-lequipe-match-stats.js, alors que le rapprochement
// club fonctionne (44 joueurs liés trouvés). Récupère l'URL du match
// directement sur la page calendrier-résultats du groupe B (comme le fait
// la synchro), télécharge la page de match, et inspecte son contenu brut.
import * as cheerio from 'cheerio';

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

const targetUrl = 'https://www.lequipe.fr/Football/national-1-groupe-b/page-calendrier-resultats/1re-journee';
console.log(`Chargement ${targetUrl} ...`);
const resCal = await fetchAvecTimeout(targetUrl);
if (!resCal.ok) { console.error(`Échec chargement page groupe : ${resCal.status}`); process.exit(1); }
const htmlCal = await resCal.text();
const $cal = cheerio.load(htmlCal);

const rencontres = [];
$cal('.TeamScore').each((i, el) => {
  const $el = $cal(el);
  const home = $el.find('.TeamScore__team--home').first().text().trim() || null;
  const away = $el.find('.TeamScore__team').filter((j, t) => !$cal(t).hasClass('TeamScore__team--home')).first().text().trim() || null;
  if (!home || !away) return;
  let $ancestor = $el;
  let href = null;
  for (let depth = 0; depth < 6 && !href; depth++) {
    $ancestor = $ancestor.parent();
    if (!$ancestor.length) break;
    const $link = $ancestor.is('a[href*="match-direct"]') ? $ancestor : $ancestor.find('a[href*="match-direct"]').first();
    if ($link.length) href = $link.attr('href');
  }
  if (href) rencontres.push({ equipe_domicile: home, equipe_exterieur: away, matchUrl: new URL(href, targetUrl).toString() });
});
console.log(`${rencontres.length} rencontre(s) trouvée(s).`);
rencontres.forEach((r) => console.log(`  ${r.equipe_domicile} vs ${r.equipe_exterieur} -> ${r.matchUrl}`));

const match = rencontres.find((r) => /hy.res/i.test(r.equipe_domicile.normalize('NFD').replace(/[̀-ͯ]/g, '')) || /hy.res/i.test(r.equipe_exterieur.normalize('NFD').replace(/[̀-ͯ]/g, '')));
if (!match) { console.log('Match Hyères introuvable sur la page.'); process.exit(0); }
console.log(`\nMatch trouvé : ${match.equipe_domicile} vs ${match.equipe_exterieur}\nURL : ${match.matchUrl}`);

const resMatch = await fetchAvecTimeout(match.matchUrl);
console.log(`Statut HTTP page match : ${resMatch.status}`);
const htmlMatch = await resMatch.text();
console.log(`Taille HTML : ${htmlMatch.length} caractères`);
const decoded = htmlMatch.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

console.log(`\nContient "specifics" : ${decoded.includes('"specifics"')}`);
console.log(`Contient "prolongation" : ${decoded.includes('prolongation')}`);
console.log(`Contient "ids_titulaires" : ${decoded.includes('ids_titulaires')}`);
console.log(`Contient "sportifs" : ${decoded.includes('sportifs')}`);
console.log(`Contient "__NEXT_DATA__" : ${decoded.includes('__NEXT_DATA__')}`);
console.log(`Contient "match-direct" : ${decoded.includes('match-direct')}`);
console.log(`Contient "buts" : ${decoded.includes('"buts"')}`);
console.log(`Contient "statut" ou "status" : statut=${decoded.includes('"statut"')} status=${decoded.includes('"status"')}`);

// Cherche toute occurrence de "specifics" en gros (au cas où la casse ou
// l'échappement diffère), et affiche le contexte autour des clés qui RESSEMBLENT
// à ce qu'on attend, pour voir la vraie structure utilisée par cette page.
const idxSpecifics = decoded.toLowerCase().indexOf('specifics');
console.log(`\nIndex (insensible à la casse) de "specifics" : ${idxSpecifics}`);
if (idxSpecifics >= 0) {
  console.log('Contexte :', decoded.slice(Math.max(0, idxSpecifics - 100), idxSpecifics + 300));
}

// Affiche un échantillon du bloc __NEXT_DATA__ ou similaire pour voir la forme réelle.
const idxNextData = decoded.indexOf('__NEXT_DATA__');
if (idxNextData >= 0) {
  console.log('\nÉchantillon autour de __NEXT_DATA__ :');
  console.log(decoded.slice(idxNextData, idxNextData + 500));
}

// Cherche un statut de match (terminé / à venir / en cours) pour vérifier si
// lequipe.fr considère ce match comme déjà joué.
const mStatut = decoded.match(/"(?:statut|status|matchStatus|state)"\s*:\s*"([^"]*)"/i);
console.log(`\nStatut détecté (regex) : ${mStatut ? mStatut[1] : 'aucun'}`);
