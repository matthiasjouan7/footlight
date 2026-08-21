// Calcule l'« impact banc » des joueurs entrés en cours de jeu : pour
// chaque but ou passe décisive d'un remplaçant, note son entrée selon le
// barème validé par l'utilisateur :
//   - équipe menait de 2 buts ou plus à l'entrée -> 0 pt
//   - équipe menait de 1 but à l'entrée -> 1 pt
//   - équipe était menée à l'entrée -> 1 pt
//   - équipe était à égalité à l'entrée, et gagne le match -> 3 pts
//   - équipe était à égalité à l'entrée, et fait match nul -> 1 pt
//   - équipe était à égalité à l'entrée, et perd quand même -> 0 pt
//
// Lecture seule (aucune écriture en base) : affiche un rapport, ne
// persiste rien. Les pages de match foot-direct.com indiquent la minute
// ET le côté (domicile/extérieur) de chaque but (classe "matchEvent--goal"
// + "matchEvent--home"/"matchEvent--away", vérifié via
// diagnostic-foot-direct-cote-buts.js) et de chaque entrée en jeu (classe
// "matchEvent--substitution", texte "MIN' Entrant (Sortant - tactique)",
// vérifié via diagnostic-foot-direct-changements.js) — de quoi
// reconstituer le score minute par minute et savoir, pour chaque
// remplaçant, la situation exacte au moment de son entrée.
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';

const targetUrl = process.env.TARGET_URL; // page de division, ex: https://www.foot-direct.com/france/ligue-3/
const division = process.env.DIVISION || 'Ligue 3';
const groupe = process.env.GROUPE || 'Unique';
const saison = process.env.SAISON;
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!targetUrl) { console.error('TARGET_URL manquant.'); process.exit(1); }
if (!saison) { console.error('SAISON manquant (ex: 2026-2027).'); process.exit(1); }
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'fr-FR,fr;q=0.9',
};

// ── Rapprochement de club (copie de sync-foot-direct-passes.js) ──
function normaliserClub(str) {
  return (str || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[.'/-]/g, ' ').replace(/\s+/g, ' ').trim();
}
const MOTS_GENERIQUES_CLUB = new Set(['fc', 'ofc', 'afc', 'asc', 'ac', 'sc', 'csc', 'cs', 'us', 'uso', 'as', 'sm', 'sa', 'vf', 'football', 'club', 'sporting', 'racing', 'stade', 'olympique', 'sur', 'sous', 'en', 'la', 'le', 'les', 'de', 'du', 'des']);
function motsClub(s) {
  const mots = normaliserClub(s).split(' ').filter(Boolean).filter((w) => !MOTS_GENERIQUES_CLUB.has(w));
  return mots.length ? mots : normaliserClub(s).split(' ').filter(Boolean);
}
const ALIAS_EQUIPE = {
  'quevilly rouen': 'QRM',
  'fleury merogis': 'FC FLEURY 91',
  'bourg peronnas': 'F BOURG EN BRESSE P01',
};
function resolverAlias(nom) {
  return ALIAS_EQUIPE[normaliserClub(nom)] || nom;
}
function clubsCorrespondent(a, b) {
  const wa = new Set(motsClub(resolverAlias(a))), wb = new Set(motsClub(resolverAlias(b)));
  if (!wa.size || !wb.size) return false;
  const [small, big] = wa.size <= wb.size ? [wa, wb] : [wb, wa];
  for (const w of small) if (!big.has(w)) return false;
  return true;
}

// ── Rapprochement de nom abrégé ("Prénom Nom" -> "p. nom") ──
function normaliserNom(str) {
  return (str || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}
function abregeAttendu(prenom, nom) {
  if (!prenom || !nom) return null;
  return normaliserNom(`${prenom[0]}. ${nom}`);
}
function abregePage(str) {
  return normaliserNom(str).replace(/^(\p{L})\.?\s*/u, '$1. ');
}

const MOIS_FR = { janvier: 1, février: 2, mars: 3, avril: 4, mai: 5, juin: 6, juillet: 7, août: 8, septembre: 9, octobre: 10, novembre: 11, décembre: 12 };
function dateDepuisTitre(titre, saisonRef) {
  const m = titre.match(/(\d{1,2})\s+([a-zéûôîàê]+)\s+(\d{4})/i);
  if (!m) return null;
  const jour = parseInt(m[1], 10), mois = MOIS_FR[m[2].toLowerCase()], annee = parseInt(m[3], 10);
  if (!mois) return null;
  return `${annee}-${String(mois).padStart(2, '0')}-${String(jour).padStart(2, '0')}`;
}

// Minute "45+2'" -> 45.2 (ordre chronologique correct, l'exacte valeur
// n'a pas d'importance tant que l'ordre relatif est respecté).
function minuteEnNombre(txt) {
  const m = txt.match(/^(\d+)(?:\+(\d+))?['’]/);
  if (!m) return null;
  return parseInt(m[1], 10) + (m[2] ? parseInt(m[2], 10) / 10 : 0);
}

function points(diffEntree, resultat) {
  if (diffEntree >= 2) return 0;
  if (diffEntree === 1) return 1;
  if (diffEntree <= -1) return 1;
  // diffEntree === 0 : à égalité à l'entrée.
  if (resultat === 'victoire') return 3;
  if (resultat === 'nul') return 1;
  return 0; // défaite malgré tout
}

// ---- 1. Page de division : liste des matchs (/live/...) ----
const resDiv = await fetch(targetUrl, { headers: HEADERS });
if (!resDiv.ok) { console.error(`Échec chargement page division : statut ${resDiv.status}`); process.exit(1); }
const htmlDiv = await resDiv.text();
const $div = cheerio.load(htmlDiv);
const matchUrls = [...new Set(
  $div('a[href*="/live/"]').map((i, el) => $div(el).attr('href')).get()
    .filter((h) => /\/live\/\d+-/.test(h))
    .map((h) => new URL(h, targetUrl).toString())
)];
console.log(`${matchUrls.length} page(s) de match trouvée(s) sur la page de division.\n`);

// ---- 2. Calendrier officiel de la division/saison ----
const { data: calRows, error: calErr } = await supabase.from('calendrier_officiel').select('id, equipe_domicile, equipe_exterieur, date_match').eq('division', division).eq('groupe', groupe).eq('saison', saison);
if (calErr) { console.error('Erreur lecture calendrier_officiel :', calErr.message); process.exit(1); }
console.log(`${calRows?.length || 0} match(s) dans calendrier_officiel pour ${division} groupe ${groupe} (${saison}).\n`);

const impacts = []; // { joueur, points, detail }
let totalMatchsAnalyses = 0, totalMatchsNonRapproches = 0, totalMatchsSansEvenement = 0;

const attendre = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// foot-direct.com renvoie 429 (trop de requêtes) au-delà d'une vingtaine
// de pages visitées rapidement — un délai entre chaque requête, avec une
// nouvelle tentative après une pause plus longue en cas de 429, permet de
// couvrir toute la saison sans se faire bloquer.
async function chargerAvecRetry(url, tentative = 1) {
  await attendre(500);
  const res = await fetch(url, { headers: HEADERS });
  if (res.status === 429 && tentative <= 3) {
    console.log(`  (429, nouvelle tentative dans ${5 * tentative}s pour ${url})`);
    await attendre(5000 * tentative);
    return chargerAvecRetry(url, tentative + 1);
  }
  return res;
}

const MAX_SAUTS = 2;
const dejaVus = new Set();
const dejaEnFile = new Set(matchUrls);
let file = [...matchUrls];

for (let saut = 1; saut <= MAX_SAUTS && file.length; saut++) {
  const lot = file;
  file = [];
  for (const matchUrl of lot) {
  if (dejaVus.has(matchUrl)) continue;
  dejaVus.add(matchUrl);
  const resMatch = await chargerAvecRetry(matchUrl);
  if (!resMatch.ok) { console.log(`${matchUrl} : échec chargement (${resMatch.status}), ignoré.`); continue; }
  const htmlMatch = await resMatch.text();
  const $m = cheerio.load(htmlMatch);
  const titre = $m('title').text().trim();

  if (saut < MAX_SAUTS) {
    const liensWidget = $m('a[href*="/live/"]').map((i, el) => $m(el).attr('href')).get()
      .filter((h) => /\/live\/\d+-/.test(h))
      .map((h) => new URL(h, matchUrl).toString());
    for (const l of liensWidget) {
      if (!dejaEnFile.has(l)) { dejaEnFile.add(l); file.push(l); }
    }
  }

  const slug = matchUrl.split('/live/')[1]?.replace(/^\d+-/, '').replace(/\/$/, '') || '';
  const parties = slug.split('-vs-');
  if (parties.length !== 2) continue;
  const [equipeA, equipeB] = parties.map((p) => p.replace(/-/g, ' '));
  const dateMatch = dateDepuisTitre(titre, saison);

  const candidatsDirects = (calRows || []).filter((c) =>
    clubsCorrespondent(c.equipe_domicile, equipeA) && clubsCorrespondent(c.equipe_exterieur, equipeB)
  );
  const candidats = candidatsDirects.length ? candidatsDirects : (calRows || []).filter((c) =>
    clubsCorrespondent(c.equipe_domicile, equipeB) && clubsCorrespondent(c.equipe_exterieur, equipeA)
  );
  const calRow = dateMatch
    ? candidats.find((c) => c.date_match === dateMatch) || null
    : (candidats.length === 1 ? candidats[0] : null);
  if (!calRow) { totalMatchsNonRapproches++; continue; }

  // Événements : buts (classe "matchEvent--goal") et entrées en jeu
  // (texte "MIN' Entrant (Sortant - tactique)", filtré aux vrais
  // remplacements — pas les cartons/VAR qui partagent des classes
  // "matchEvent" voisines).
  const evenementsBrut = $m('.matchEvent').toArray();
  const buts = [];
  const entrees = [];
  for (const el of evenementsBrut) {
    const $el = $m(el);
    const classe = $el.attr('class') || '';
    const texte = $el.text().trim().replace(/\s+/g, ' ');
    const minute = minuteEnNombre(texte);
    if (minute == null) continue;
    const cote = classe.includes('matchEvent--home') ? 'domicile' : classe.includes('matchEvent--away') ? 'exterieur' : null;
    if (!cote) continue;
    if (classe.includes('matchEvent--goal')) {
      // Nom du buteur : entre la minute et une éventuelle parenthèse
      // ("(P.D X)" passeur, ou "(sur penalty)").
      const m2 = texte.match(/^\d+(?:\+\d+)?['’]\s*(.+?)(?:\s*\(.*)?$/);
      const buteur = m2 ? abregePage(m2[1]) : null;
      const mPasseur = texte.match(/\(P\.?\s*D\.?\s+(.+?)\)/i);
      const passeur = mPasseur ? abregePage(mPasseur[1]) : null;
      buts.push({ minute, cote, buteur, passeur });
    } else if (/tactique\)$/.test(texte)) {
      const m3 = texte.match(/^\d+(?:\+\d+)?['’]\s*(.+?)\s*\(.+?-\s*tactique\)$/);
      const entrant = m3 ? abregePage(m3[1]) : null;
      if (entrant) entrees.push({ minute, cote, entrant });
    }
  }
  if (!buts.length && !entrees.length) { totalMatchsSansEvenement++; continue; }

  totalMatchsAnalyses++;
  buts.sort((a, b) => a.minute - b.minute);

  // Score domicile/extérieur au fil du match.
  let scoreDom = 0, scoreExt = 0;
  const scoreAuMoment = (minute) => ({ dom: scoreDom, ext: scoreExt });
  const scoreAEntree = new Map(); // clé "cote|entrant" -> {dom, ext} au moment de l'entrée
  const evenementsTries = [...buts.map((b) => ({ ...b, type: 'but' })), ...entrees.map((e) => ({ ...e, type: 'entree' }))].sort((a, b) => a.minute - b.minute);
  for (const ev of evenementsTries) {
    if (ev.type === 'entree') {
      scoreAEntree.set(`${ev.cote}|${ev.entrant}`, { dom: scoreDom, ext: scoreExt });
    } else {
      if (ev.cote === 'domicile') scoreDom++; else scoreExt++;
    }
  }
  const resultatDomicile = scoreDom > scoreExt ? 'victoire' : scoreDom === scoreExt ? 'nul' : 'defaite';
  const resultatExterieur = scoreExt > scoreDom ? 'victoire' : scoreDom === scoreExt ? 'nul' : 'defaite';

  console.log(`\n--- ${titre} (score final ${scoreDom}-${scoreExt}) ---`);

  // Joueurs FootLight liés à ce match.
  const { data: mj } = await supabase.from('matchs_joueur').select('id, joueur_id, saison').eq('calendrier_officiel_id', calRow.id);
  if (!mj || !mj.length) continue;
  const { data: joueursData } = await supabase.from('joueurs').select('id, prenom, nom, club, saison').in('id', [...new Set(mj.map((m) => m.joueur_id))]);
  const joueursById = new Map((joueursData || []).map((j) => [j.id, j]));

  // Contributions (but ou passe déc.) par remplaçant identifié.
  const contributionsParEntrant = new Map(); // clé "cote|nom" -> true si but ou passe déc.
  for (const b of buts) {
    if (b.buteur) contributionsParEntrant.set(`${b.cote}|${b.buteur}`, true);
    if (b.passeur) contributionsParEntrant.set(`${b.cote}|${b.passeur}`, true);
  }

  for (const e of entrees) {
    const cle = `${e.cote}|${e.entrant}`;
    if (!contributionsParEntrant.has(cle)) continue; // n'a ni marqué ni délivré de passe déc.
    const scoreEntree = scoreAEntree.get(cle);
    if (!scoreEntree) continue;
    const diffEntree = e.cote === 'domicile' ? scoreEntree.dom - scoreEntree.ext : scoreEntree.ext - scoreEntree.dom;
    const resultat = e.cote === 'domicile' ? resultatDomicile : resultatExterieur;
    const pts = points(diffEntree, resultat);

    // Rapprochement au joueur FootLight (même équipe = même club que
    // calRow.equipe_domicile/equipe_exterieur).
    const correspondances = mj
      .map((row) => ({ row, joueur: joueursById.get(row.joueur_id) }))
      .filter(({ joueur }) => joueur && abregeAttendu(joueur.prenom, joueur.nom) === e.entrant);
    if (correspondances.length !== 1) continue; // pas trouvé ou ambigu, ignoré
    const { joueur } = correspondances[0];

    const situation = diffEntree >= 2 ? `menait ${Math.abs(diffEntree)} but(s)` : diffEntree === 1 ? 'menait de 1 but' : diffEntree === 0 ? 'à égalité' : `était mené ${Math.abs(diffEntree)} but(s)`;
    console.log(`  ${joueur.prenom} ${joueur.nom} (${joueur.club}) : entré à la ${e.minute}', ${situation}, résultat final ${resultat} -> ${pts} pt(s)`);
    impacts.push({ joueur: `${joueur.prenom} ${joueur.nom}`, club: joueur.club, points: pts, match: titre });
  }
  }
}

impacts.sort((a, b) => b.points - a.points);
console.log(`\n\n=== Classement impact banc (${impacts.length} contribution(s) identifiée(s)) ===`);
for (const i of impacts) console.log(`  ${i.points} pt(s) — ${i.joueur} (${i.club}) — ${i.match}`);

console.log(`\nRésumé : ${dejaVus.size} page(s) de match visitée(s), ${totalMatchsAnalyses} avec événements analysés, ${totalMatchsNonRapproches} non rapproché(s) à calendrier_officiel, ${totalMatchsSansEvenement} sans but/entrée détecté(s) (match pas encore joué probablement).`);
