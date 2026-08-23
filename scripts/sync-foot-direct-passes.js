// Synchronise les passes décisives PAR MATCH depuis foot-direct.com : la
// page de chaque match liste les buts avec le passeur ("87' G. Morgan (P.D
// A. Majid)"), une info absente de L'Équipe (vérifié via
// diagnostic-lequipe-specifics.js — un "but" n'y contient que le buteur).
//
// Visite la page d'une division (liste de matchs /live/...), rapproche
// chaque match à calendrier_officiel via équipes+date (comme
// sync-lequipe-to-calendrier.js), puis écrit passes_decisives sur les
// lignes matchs_joueur concernées — même principe que
// lib-sync-lequipe-match-stats.js pour les buts/cartons individuels.
//
// Sécurité : DRY_RUN=true par défaut.
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';

const targetUrl = process.env.TARGET_URL; // page de division, ex: https://www.foot-direct.com/france/ligue-3/
const division = process.env.DIVISION || 'Ligue 3';
// GROUPE accepte une liste séparée par des virgules : la page National 1 de
// foot-direct.com (/france/national-1/) mélange les 3 groupes A/B/C sur une
// seule page (vérifié via diagnostic-foot-direct-national1-urls.js — pas de
// page par groupe séparée comme sur lequipe.fr), contrairement à Ligue 3
// (groupe "Unique").
const groupes = (process.env.GROUPE || 'Unique').split(',').map((g) => g.trim()).filter(Boolean);
const saison = process.env.SAISON;
const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!targetUrl) { console.error('TARGET_URL manquant.'); process.exit(1); }
if (!saison) { console.error('SAISON manquant (ex: 2026-2027).'); process.exit(1); }
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);

const supabase = createClient(supabaseUrl, supabaseKey);
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'fr-FR,fr;q=0.9',
};

// ── Rapprochement de club (copie du principe déjà utilisé par
// generer-calendriers-existants.js / sync-lequipe-to-calendrier.js) ──
function normaliserClub(str) {
  return (str || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[.'/-]/g, ' ').replace(/\s+/g, ' ').trim();
}
const MOTS_GENERIQUES_CLUB = new Set(['fc', 'ofc', 'afc', 'asc', 'ac', 'sc', 'csc', 'cs', 'us', 'uso', 'as', 'sm', 'sa', 'vf', 'football', 'club', 'sporting', 'racing', 'stade', 'olympique', 'sur', 'sous', 'en', 'la', 'le', 'les', 'de', 'du', 'des']);
function motsClub(s) {
  const mots = normaliserClub(s).split(' ').filter(Boolean).filter((w) => !MOTS_GENERIQUES_CLUB.has(w));
  return mots.length ? mots : normaliserClub(s).split(' ').filter(Boolean);
}
// Alias explicites : certains noms foot-direct.com n'ont aucun mot commun
// avec le nom officiel en base, même après retrait des mots génériques
// (ex: "Quevilly-Rouen" vs "QRM", "Bourg-Péronnas" vs "F BOURG EN BRESSE
// P01" — aucun rapprochement flou possible, "peronnas"/"quevilly" n'existe
// pas dans le nom officiel). Repérés en pratique via un run à blanc.
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

// ── Rapprochement de nom abrégé ("Prénom Nom" -> "p. nom", même
// convention que lib-sync-lequipe-match-stats.js) ──
function normaliserNom(str) {
  return (str || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}
function abregeAttendu(prenom, nom) {
  if (!prenom || !nom) return null;
  return normaliserNom(`${prenom[0]}. ${nom}`);
}
function abregePage(str) {
  // La page écrit parfois l'abrégé sans espace après le point ("K.Faradé") :
  // on normalise vers le même format que abregeAttendu ("k. farade").
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

// contributionMatch/deltaContributionMatch : mêmes champs suivis que
// lib-sync-lequipe-match-stats.js (passes_decisives y est déjà pris en
// compte), pour que le total de saison se mette à jour correctement.
function contributionMatch(m) {
  const n = (v) => (v == null ? 0 : v);
  if (!m) return { matchs_joues: 0, titularisations: 0, matchs_remplacant: 0, buts: 0, passes_decisives: 0, minutes_jouees: 0, cartons_jaunes: 0, cartons_rouges: 0, buts_encaisses_avec: 0, clean_sheets: 0 };
  const joue = m.minutes_jouees != null;
  return {
    matchs_joues: joue ? 1 : 0, titularisations: joue && m.titulaire === true ? 1 : 0, matchs_remplacant: joue && m.titulaire === false ? 1 : 0,
    buts: n(m.buts), passes_decisives: n(m.passes_decisives), minutes_jouees: n(m.minutes_jouees),
    cartons_jaunes: n(m.cartons_jaunes), cartons_rouges: n(m.cartons_rouges), buts_encaisses_avec: n(m.buts_encaisses_avec),
    clean_sheets: joue && !!m.clean_sheet ? 1 : 0,
  };
}
function deltaContributionMatch(ancien, nouveau) {
  const a = contributionMatch(ancien), n = contributionMatch(nouveau);
  const delta = {};
  Object.keys(n).forEach((c) => { delta[c] = n[c] - a[c]; });
  return delta;
}
async function appliquerDeltaSaison(joueurId, joueurSaison, saisonFiche, delta) {
  const champs = Object.keys(delta).filter((c) => delta[c] !== 0);
  if (!champs.length) return;
  const isCurrentSeason = saisonFiche === (joueurSaison || '2026-2027');
  let current;
  if (isCurrentSeason) ({ data: current } = await supabase.from('joueurs').select(champs.join(',')).eq('id', joueurId).single());
  else ({ data: current } = await supabase.from('stats_saisons').select(champs.join(',')).eq('joueur_id', joueurId).eq('saison', saisonFiche).single());
  const maj = {};
  champs.forEach((c) => { maj[c] = (current && current[c] != null ? current[c] : 0) + delta[c]; });
  if (isCurrentSeason) await supabase.from('joueurs').update(maj).eq('id', joueurId);
  else await supabase.from('stats_saisons').upsert({ joueur_id: joueurId, saison: saisonFiche, ...maj }, { onConflict: 'joueur_id,saison' });
}

const attendre = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Le fetch natif n'a pas de timeout par défaut : une requête qui ne répond
// jamais bloquerait le script indéfiniment.
async function fetchAvecTimeout(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { headers: HEADERS, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// foot-direct.com renvoie 429 (trop de requêtes) au-delà d'une vingtaine de
// pages visitées rapidement — un délai entre chaque requête, avec une
// nouvelle tentative après une pause plus longue en cas de 429, permet de
// couvrir un crawl multi-sauts (jusqu'à plusieurs centaines de pages pour
// National 1, page unique tous groupes confondus) sans se faire bloquer.
async function chargerAvecRetry(url, tentative = 1) {
  await attendre(500);
  let res;
  try {
    res = await fetchAvecTimeout(url);
  } catch (err) {
    if (tentative <= 2) return chargerAvecRetry(url, tentative + 1);
    return { ok: false, status: 0 };
  }
  if (res.status === 429 && tentative <= 2) {
    await attendre(5000 * tentative);
    return chargerAvecRetry(url, tentative + 1);
  }
  return res;
}

// ---- 1. Page de division : liste des matchs (/live/...) ----
// La page de division ne liste que les journées récentes/à venir (ex: les
// matchs de la journée 1 en disparaissent après quelques semaines). Chaque
// page de match affiche cependant un widget "matchs récents" par équipe qui
// continue de pointer vers ces anciennes pages — on suit donc ces liens sur
// un deuxième niveau (limité à 2 sauts) pour retrouver les journées
// disparues. Les pages hors Ligue 3 (coupe, autres divisions) rencontrées au
// passage échouent simplement au rapprochement calendrier_officiel plus bas.
const resDiv = await chargerAvecRetry(targetUrl);
if (!resDiv.ok) { console.error(`Échec chargement page division : statut ${resDiv.status}`); process.exit(1); }
const htmlDiv = await resDiv.text();
const $div = cheerio.load(htmlDiv);
const matchUrls = [...new Set(
  $div('a[href*="/live/"]').map((i, el) => $div(el).attr('href')).get()
    .filter((h) => /\/live\/\d+-/.test(h))
    .map((h) => new URL(h, targetUrl).toString())
)];
console.log(`${matchUrls.length} page(s) de match trouvée(s) sur la page de division.\n`);

// ---- 2. Calendrier officiel de la division/saison (une seule lecture) ----
const { data: calRows, error: calErr } = await supabase.from('calendrier_officiel').select('id, equipe_domicile, equipe_exterieur, date_match').eq('division', division).in('groupe', groupes).eq('saison', saison);
if (calErr) { console.error('Erreur lecture calendrier_officiel :', calErr.message); process.exit(1); }
console.log(`${calRows?.length || 0} match(s) dans calendrier_officiel pour ${division} groupe(s) ${groupes.join('/')} (${saison}).\n`);

let totalMatchsTraites = 0, totalMatchsNonRapproches = 0, totalJoueursMaj = 0, totalAmbigus = 0, totalPasseursIgnores = 0;

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

  // Équipes depuis le slug de l'URL ("cannes-vs-fleury-merogis").
  const slug = matchUrl.split('/live/')[1]?.replace(/^\d+-/, '').replace(/\/$/, '') || '';
  const parties = slug.split('-vs-');
  if (parties.length !== 2) { console.log(`${matchUrl} : slug inattendu ("${slug}"), ignoré.`); continue; }
  const [equipeA, equipeB] = parties.map((p) => p.replace(/-/g, ' '));
  const dateMatch = dateDepuisTitre(titre, saison);

  // On privilégie l'ordre domicile/extérieur strict du slug ("A-vs-B" =
  // A reçoit B) : un aller et un retour entre les deux mêmes équipes ont
  // l'ordre inversé, donc n'accepter l'ordre inverse qu'en absence de
  // candidat dans l'ordre direct évite l'ambiguïté (ex: Caen vs Bastia).
  const candidatsDirects = (calRows || []).filter((c) =>
    clubsCorrespondent(c.equipe_domicile, equipeA) && clubsCorrespondent(c.equipe_exterieur, equipeB)
  );
  const candidats = candidatsDirects.length ? candidatsDirects : (calRows || []).filter((c) =>
    clubsCorrespondent(c.equipe_domicile, equipeB) && clubsCorrespondent(c.equipe_exterieur, equipeA)
  );
  // La date doit toujours être vérifiée quand elle est connue : le crawl
  // multi-sauts remonte aussi d'anciens matchs entre les deux mêmes clubs
  // (saisons précédentes), et un candidat unique ne suffit pas à garantir
  // qu'il s'agit bien du match de la saison en cours (ex: "Quevilly-Rouen
  // vs Fleury-Mérogis" du 03/10/2025, hors saison, aurait sinon écrasé les
  // stats du seul match 2026-2027 entre ces deux clubs).
  const calRow = dateMatch
    ? candidats.find((c) => c.date_match === dateMatch) || null
    : (candidats.length === 1 ? candidats[0] : null);
  if (!calRow) {
    console.log(`${titre} : aucune correspondance calendrier_officiel (${candidats.length} candidat(s)), ignoré.`);
    totalMatchsNonRapproches++;
    continue;
  }

  // Joueurs FootLight liés à ce match.
  const { data: mj, error: mjErr } = await supabase.from('matchs_joueur').select('id, joueur_id, saison, passes_decisives').eq('calendrier_officiel_id', calRow.id);
  if (mjErr || !mj || !mj.length) continue;
  const { data: joueursData } = await supabase.from('joueurs').select('id, prenom, nom, saison').in('id', [...new Set(mj.map((m) => m.joueur_id))]);
  const joueursById = new Map((joueursData || []).map((j) => [j.id, j]));

  // Buts avec passeur ("87' G. Morgan (P.D A. Majid)").
  const evenements = $m('[class*="goal"]').map((i, el) => $m(el).text().trim()).get()
    .filter((t) => /^\d+(\+\d+)?['’]/.test(t));
  const passeurs = [];
  for (const texte of evenements) {
    if (/var/i.test(texte) && /pas de but/i.test(texte)) continue; // but refusé
    const m2 = texte.match(/\(P\.?\s*D\.?\s+(.+?)\)/i);
    if (m2) passeurs.push(abregePage(m2[1]));
  }
  if (!passeurs.length) { totalMatchsTraites++; continue; }

  console.log(`\n--- ${titre} ---`);
  totalMatchsTraites++;

  // Compte les passes par passeur pour ce match, puis rapproche à un joueur FootLight.
  const comptes = new Map();
  for (const p of passeurs) comptes.set(p, (comptes.get(p) || 0) + 1);

  for (const [abrege, nb] of comptes) {
    const correspondances = mj
      .map((row) => ({ row, joueur: joueursById.get(row.joueur_id) }))
      .filter(({ joueur }) => joueur && abregeAttendu(joueur.prenom, joueur.nom) === abrege);
    if (!correspondances.length) continue; // pas un joueur FootLight
    if (correspondances.length > 1) {
      console.log(`  "${abrege}" : ${correspondances.length} joueurs FootLight partagent cet abrégé, ambigu, ignoré.`);
      totalAmbigus++;
      totalPasseursIgnores++;
      continue;
    }
    const { row, joueur } = correspondances[0];
    if (row.passes_decisives != null) {
      console.log(`  ${joueur.prenom} ${joueur.nom} : passes_decisives déjà renseigné (${row.passes_decisives}), non modifié malgré ${nb} détectée(s).`);
      continue;
    }
    console.log(`  ${joueur.prenom} ${joueur.nom} : ${nb} passe(s) décisive(s)`);
    totalJoueursMaj++;
    const delta = deltaContributionMatch(row, { ...row, passes_decisives: nb });
    if (!dryRun) {
      const { error: updErr } = await supabase.from('matchs_joueur').update({ passes_decisives: nb }).eq('id', row.id);
      if (updErr) { console.log(`    Erreur écriture : ${updErr.message}`); continue; }
      await appliquerDeltaSaison(row.joueur_id, joueur.saison, row.saison, delta);
    }
  }
  }
}

console.log(`\nRésumé : ${dejaVus.size} page(s) de match visitée(s) (dont ${matchUrls.length} sur la page de division), ${totalMatchsTraites} avec au moins un but analysé, ${totalMatchsNonRapproches} non rapproché(s) à calendrier_officiel, ${totalJoueursMaj} mise(s) à jour ${dryRun ? 'proposée(s)' : 'effectuée(s)'}, ${totalAmbigus} ambiguïté(s) ignorée(s).`);
if (dryRun) console.log('DRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
