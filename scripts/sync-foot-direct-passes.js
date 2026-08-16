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
const groupe = process.env.GROUPE || 'Unique';
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
function clubsCorrespondent(a, b) {
  const wa = new Set(motsClub(a)), wb = new Set(motsClub(b));
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

// ---- 2. Calendrier officiel de la division/saison (une seule lecture) ----
const { data: calRows, error: calErr } = await supabase.from('calendrier_officiel').select('id, equipe_domicile, equipe_exterieur, date_match').eq('division', division).eq('groupe', groupe).eq('saison', saison);
if (calErr) { console.error('Erreur lecture calendrier_officiel :', calErr.message); process.exit(1); }
console.log(`${calRows?.length || 0} match(s) dans calendrier_officiel pour ${division} groupe ${groupe} (${saison}).\n`);

let totalMatchsTraites = 0, totalMatchsNonRapproches = 0, totalJoueursMaj = 0, totalAmbigus = 0, totalPasseursIgnores = 0;

for (const matchUrl of matchUrls) {
  const resMatch = await fetch(matchUrl, { headers: HEADERS });
  if (!resMatch.ok) { console.log(`${matchUrl} : échec chargement (${resMatch.status}), ignoré.`); continue; }
  const htmlMatch = await resMatch.text();
  const $m = cheerio.load(htmlMatch);
  const titre = $m('title').text().trim();

  // Équipes depuis le slug de l'URL ("cannes-vs-fleury-merogis").
  const slug = matchUrl.split('/live/')[1]?.replace(/^\d+-/, '').replace(/\/$/, '') || '';
  const parties = slug.split('-vs-');
  if (parties.length !== 2) { console.log(`${matchUrl} : slug inattendu ("${slug}"), ignoré.`); continue; }
  const [equipeA, equipeB] = parties.map((p) => p.replace(/-/g, ' '));
  const dateMatch = dateDepuisTitre(titre, saison);

  const candidats = (calRows || []).filter((c) => {
    const matchDirect = clubsCorrespondent(c.equipe_domicile, equipeA) && clubsCorrespondent(c.equipe_exterieur, equipeB);
    const matchInverse = clubsCorrespondent(c.equipe_domicile, equipeB) && clubsCorrespondent(c.equipe_exterieur, equipeA);
    return matchDirect || matchInverse;
  });
  const calRow = candidats.length === 1 ? candidats[0]
    : (dateMatch ? candidats.find((c) => c.date_match === dateMatch) : null);
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

console.log(`\nRésumé : ${matchUrls.length} page(s) de match visitée(s), ${totalMatchsTraites} avec au moins un but analysé, ${totalMatchsNonRapproches} non rapproché(s) à calendrier_officiel, ${totalJoueursMaj} mise(s) à jour ${dryRun ? 'proposée(s)' : 'effectuée(s)'}, ${totalAmbigus} ambiguïté(s) ignorée(s).`);
if (dryRun) console.log('DRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
