// Synchro stats ciblée pour Ruben Rosa (QRM) uniquement, journées 1 à 3 —
// l'utilisateur signale à raison que lancer rattrapage-lequipe-match-stats.js
// sur toute la Ligue 3 (~12 min) est disproportionné pour mettre à jour un
// seul joueur. Ne charge que les 3 pages de match concernant QRM (au lieu
// de toutes celles de la division), avec la même extraction que
// lib-sync-lequipe-match-stats.js (buts/cartons/minutes depuis le bloc
// "specifics").
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

function normaliser(str) { return (str || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); }
function abregeAttendu(prenom, nom) { return normaliser(`${prenom[0]}. ${nom}`); }
function extractBalancedObject(text, keyPattern) {
  const m = text.match(keyPattern);
  if (!m) return null;
  const start = m.index + m[0].length - 1;
  let depth = 0, inString = false, escaped = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') { inString = true; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return text.slice(start, i + 1); }
  }
  return null;
}

const { data: joueur, error: errJ } = await supabase.from('joueurs').select('id, prenom, nom, saison').eq('prenom', 'Ruben').eq('nom', 'Rosa').single();
if (errJ) { console.error('Erreur joueur :', errJ.message); process.exit(1); }
const attendu = abregeAttendu(joueur.prenom, joueur.nom);
console.log(`Joueur : ${joueur.prenom} ${joueur.nom} (abrégé attendu "${attendu}")`);

// Même logique que recalculerAgregatsSaison() dans lib-sync-lequipe-match-stats.js :
// recalcule le total à partir de TOUTES les lignes matchs_joueur (idempotent),
// plutôt qu'un delta qui pourrait doubler-compter en cas de ré-exécution.
function contributionMatch(m) {
  const n = (v) => (v == null ? 0 : v);
  const joue = m.minutes_jouees != null;
  return {
    matchs_joues: joue ? 1 : 0,
    titularisations: joue && m.titulaire === true ? 1 : 0,
    matchs_remplacant: joue && m.titulaire === false ? 1 : 0,
    buts: n(m.buts),
    passes_decisives: n(m.passes_decisives),
    minutes_jouees: n(m.minutes_jouees),
    cartons_jaunes: n(m.cartons_jaunes),
    cartons_rouges: n(m.cartons_rouges),
  };
}
async function recalculerAgregats() {
  const { data: matchs } = await supabase.from('matchs_joueur').select('minutes_jouees, titulaire, buts, passes_decisives, cartons_jaunes, cartons_rouges').eq('joueur_id', joueur.id).eq('saison', joueur.saison);
  const totaux = (matchs || []).reduce((acc, m) => {
    const c = contributionMatch(m);
    Object.keys(c).forEach((k) => { acc[k] = (acc[k] || 0) + c[k]; });
    return acc;
  }, {});
  if (!dryRun) await supabase.from('joueurs').update(totaux).eq('id', joueur.id);
  return totaux;
}

const JOURNEES = [
  'https://www.lequipe.fr/Football/ligue-3/page-calendrier-resultats/1re-journee',
  'https://www.lequipe.fr/Football/ligue-3/page-calendrier-resultats/2e-journee',
  'https://www.lequipe.fr/Football/ligue-3/page-calendrier-resultats/3e-journee',
];

let totalMaj = 0;
for (const url of JOURNEES) {
  console.log(`\n--- ${url} ---`);
  const resCal = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!resCal.ok) { console.log(`  Échec chargement (${resCal.status}).`); continue; }
  const $ = cheerio.load(await resCal.text());

  let matchUrl = null, domicile = null, adversaire = null;
  $('.TeamScore').each((_, el) => {
    const $el = $(el);
    const home = $el.find('.TeamScore__team--home').first().text().trim() || '';
    const away = $el.find('.TeamScore__team').filter((j, t) => !$(t).hasClass('TeamScore__team--home')).first().text().trim() || '';
    if (!/^qrm$/i.test(home.trim()) && !/^qrm$/i.test(away.trim())) return;
    domicile = /^qrm$/i.test(home.trim());
    adversaire = domicile ? away : home;
    let $ancestor = $el;
    for (let depth = 0; depth < 6 && !matchUrl; depth++) {
      $ancestor = $ancestor.parent();
      if (!$ancestor.length) break;
      const $link = $ancestor.is('a[href*="match-direct"]') ? $ancestor : $ancestor.find('a[href*="match-direct"]').first();
      if ($link.length) matchUrl = new URL($link.attr('href'), url).toString();
    }
  });
  if (!matchUrl) { console.log('  Match QRM introuvable sur cette page.'); continue; }
  console.log(`  Match URL : ${matchUrl} (QRM ${domicile ? 'domicile' : 'extérieur'} vs ${adversaire})`);

  const resMatch = await fetch(matchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!resMatch.ok) { console.log(`  Échec chargement page match (${resMatch.status}).`); continue; }
  const decoded = (await resMatch.text()).replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  const specificsRaw = extractBalancedObject(decoded, /"specifics"\s*:\s*\{/);
  if (!specificsRaw) { console.log('  Bloc "specifics" introuvable.'); continue; }
  let specifics;
  try { specifics = JSON.parse(specificsRaw); } catch (e) { console.log(`  Échec JSON.parse : ${e.message}`); continue; }

  const cote = domicile ? specifics.domicile : specifics.exterieur;
  const finMatch = specifics.prolongation ? 120 : 90;
  const butsDom = (specifics.domicile?.buts || []).length;
  const butsExt = (specifics.exterieur?.buts || []).length;
  const scorePour = domicile ? butsDom : butsExt;
  const scoreContre = domicile ? butsExt : butsDom;
  const buts = (cote?.buts || []).filter((b) => normaliser(b.joueur?.nom_abrege) === attendu).length;
  const jaunes = (cote?.cartons || []).filter((c) => c.type === 'jaune' && normaliser(c.joueur?.nom_abrege) === attendu).length;
  const rouges = (cote?.cartons || []).filter((c) => c.type === 'rouge' && normaliser(c.joueur?.nom_abrege) === attendu).length;
  const sportif = (cote?.sportifs || []).find((s) => normaliser(s.nom_abrege) === attendu);
  let minutes = null, titulaire = null;
  if (sportif) {
    const titulaires = new Set(cote.ids_titulaires || []);
    const remplacants = new Set(cote.ids_remplacants || []);
    const remplacements = cote.remplacements || [];
    if (titulaires.has(sportif.id)) {
      titulaire = true;
      const sortie = remplacements.find((r) => r.sortant?.id === sportif.id);
      minutes = sortie ? parseInt(sortie.instant?.date, 10) : finMatch;
    } else if (remplacants.has(sportif.id)) {
      titulaire = false;
      const entree = remplacements.find((r) => r.entrant?.id === sportif.id);
      minutes = entree ? finMatch - parseInt(entree.instant?.date, 10) : 0;
    }
  }
  console.log(`  score=${scorePour}-${scoreContre} buts=${buts} cartons_jaunes=${jaunes} cartons_rouges=${rouges} titulaire=${titulaire} minutes_jouees=${minutes}`);

  const { data: row, error: errRow } = await supabase
    .from('matchs_joueur')
    .select('id, score_pour, score_contre, buts, cartons_jaunes, cartons_rouges, titulaire, minutes_jouees, adversaire')
    .eq('joueur_id', joueur.id)
    .eq('domicile', domicile)
    .ilike('adversaire', adversaire);
  if (errRow || !row?.length) { console.log(`  Ligne matchs_joueur introuvable (${errRow?.message || 'aucune correspondance pour adversaire=' + adversaire})`); continue; }
  const cible = row[0];

  const maj = {};
  if (cible.score_pour == null) { maj.score_pour = scorePour; maj.score_contre = scoreContre; }
  if (cible.buts == null && buts > 0) maj.buts = buts;
  if (cible.cartons_jaunes == null && jaunes > 0) maj.cartons_jaunes = jaunes;
  if (cible.cartons_rouges == null && rouges > 0) maj.cartons_rouges = rouges;
  if (cible.minutes_jouees == null && minutes != null) maj.minutes_jouees = minutes;
  if (cible.titulaire == null && titulaire != null) maj.titulaire = titulaire;

  if (!Object.keys(maj).length) { console.log('  Rien à mettre à jour (déjà renseigné ou joueur non identifié sur ce match).'); continue; }
  console.log(`  Mise à jour ligne id=${cible.id} : ${JSON.stringify(maj)}`);
  totalMaj++;
  if (!dryRun) {
    const { error: updErr } = await supabase.from('matchs_joueur').update(maj).eq('id', cible.id);
    if (updErr) console.log(`    Erreur écriture : ${updErr.message}`);
  }
}

const totaux = await recalculerAgregats();
console.log(`\nAgrégats saison recalculés : ${JSON.stringify(totaux)}`);
console.log(`Résumé : ${totalMaj} ligne(s) ${dryRun ? 'à mettre à jour' : 'mise(s) à jour'}.`);
if (dryRun) console.log('DRY RUN : rien n\'a été écrit.');
