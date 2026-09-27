// Diagnostic lecture seule, systématique, toutes divisions (N1, N2, Ligue
// 3) : au lieu d'attendre que l'utilisateur signale un club après l'autre
// (Hyères/GFA RV, Alençon/Alençonnaise, Riviera/Fosséenne...), repère
// PROACTIVEMENT toutes les journées où le nombre de lignes calendrier_officiel
// dépasse le nombre "normal" pour ce groupe — signe quasi certain d'un
// doublon causé par un club non reconnu (même mot en commun côté lequipe.fr
// et côté officiel), sans avoir besoin d'accéder à lequipe.fr ou Transfermarkt
// (fonctionne même quand ces sites bloquent nos requêtes).
//
// Pour chaque doublon suspect, tente d'identifier lequel des 2 clubs pose
// probablement problème en réutilisant exactement la même logique de
// rapprochement que sync-lequipe-to-calendrier.js (clubIdentitySignature /
// clubWordsElargi), pour distinguer un vrai doublon (aucun mot en commun
// entre les 2 graphies d'un même club réel) d'un simple report de date
// légitime (2 matchs réellement différents, ex: match remis à une date
// proche).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const SAISON = '2026-2027';
const PAGE_SIZE = 1000;

// ---- Moteur de rapprochement club, copié de sync-lequipe-to-calendrier.js ----
function normalizeName(s) { return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' '); }
function normalizeClub(s) { return normalizeName(s).replace(/[.'/-]/g, ' ').replace(/\s+/g, ' ').trim().replace(/\s\d{1,2}$/, ''); }
const CLUB_MOTS_GENERIQUES = new Set([
  'fc', 'ofc', 'afc', 'asc', 'ac', 'sc', 'csc', 'cs', 'us', 'uso', 'as', 'sa', 'sas',
  'sr', 'srfa', 'ol', 'om', 'rc', 'fco', 'osc', 'sco', 'ent', 'entente', 'athletic',
  'olympique', 'football', 'club', 'sporting', 'racing', 'stade',
  'sur', 'sous', 'en', 'la', 'le', 'les', 'de', 'du', 'des',
  'af', 'aj', 'd', 'may', 'losc', 'lorraine', 'montb', 'alsace', 'hsc', 'berri', 'et', 's', 'es',
]);
const CLUB_MOTS_REMPLACEMENT = {
  st: 'saint', ste: 'sainte', gd: 'grand', philibert: 'philbert',
  virois: 'vire', bayonnais: 'bayonne', briochin: 'brieuc', vfc: 'vendee', sbfc: 'beaucairois',
  alenconnaise: 'alencon', raph: 'raphael',
};
function clubWords(s) {
  const mots = normalizeClub(s).split(' ').filter(Boolean);
  const remplaces = mots.map((w) => CLUB_MOTS_REMPLACEMENT[w] || w);
  const sansCodesDepartement = remplaces.filter((w) => !/^\d{1,3}$/.test(w));
  const sansGeneriques = sansCodesDepartement.filter((w) => !CLUB_MOTS_GENERIQUES.has(w));
  return sansGeneriques.length ? sansGeneriques : remplaces;
}
function motsProches(a, b) {
  if (a === b) return true;
  const [court, long] = a.length <= b.length ? [a, b] : [b, a];
  return court.length >= 4 && long.startsWith(court);
}
function clubsCorrespondent(a, b) {
  const wa = clubWords(a), wb = clubWords(b);
  if (!wa.length || !wb.length) return false;
  const [small, big] = wa.length <= wb.length ? [wa, wb] : [wb, wa];
  for (const w of small) if (!big.some((w2) => motsProches(w, w2))) return false;
  return true;
}
// ------------------------------------------------------------------------

async function fetchAll(select, filtreFn) {
  let all = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let q = supabase.from('calendrier_officiel').select(select).eq('saison', SAISON).range(from, from + PAGE_SIZE - 1);
    if (filtreFn) q = filtreFn(q);
    const { data, error } = await q;
    if (error) { console.error('Erreur lecture :', error.message); process.exit(1); }
    if (!data || !data.length) break;
    all = all.concat(data);
    if (data.length < PAGE_SIZE) break;
  }
  return all;
}

const tout = await fetchAll('id, division, groupe, journee, date_match, equipe_domicile, equipe_exterieur');
console.log(`${tout.length} ligne(s) calendrier_officiel au total (saison ${SAISON}).\n`);

// Regroupe par division+groupe.
const parGroupe = new Map();
for (const m of tout) {
  const cle = `${m.division || '?'} ${m.groupe || '?'}`;
  if (!parGroupe.has(cle)) parGroupe.set(cle, []);
  parGroupe.get(cle).push(m);
}

let totalSuspects = 0;
for (const [cle, matchs] of [...parGroupe.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  // Compte le nombre de lignes par journée.
  const parJournee = new Map();
  for (const m of matchs) {
    if (m.journee == null) continue;
    if (!parJournee.has(m.journee)) parJournee.set(m.journee, []);
    parJournee.get(m.journee).push(m);
  }
  if (parJournee.size < 3) continue; // pas assez de données pour établir une norme
  const comptes = [...parJournee.values()].map((v) => v.length);
  // Norme = valeur la plus fréquente (mode).
  const frequence = new Map();
  for (const c of comptes) frequence.set(c, (frequence.get(c) || 0) + 1);
  const norme = [...frequence.entries()].sort((a, b) => b[1] - a[1])[0][0];

  const journeesSuspectes = [...parJournee.entries()].filter(([, v]) => v.length > norme);
  if (!journeesSuspectes.length) continue;

  console.log(`\n=== ${cle} (norme : ${norme} match(s)/journée) ===`);
  for (const [journee, rows] of journeesSuspectes.sort((a, b) => a[0] - b[0])) {
    console.log(`  Journée ${journee} : ${rows.length} lignes (attendu ${norme}) :`);
    for (const r of rows) console.log(`    id=${r.id} "${r.equipe_domicile}" vs "${r.equipe_exterieur}" (${r.date_match})`);
    // Cherche, parmi les paires, celles où AUCUN des deux clubs ne se
    // recoupe avec un club d'une autre ligne de la même journée — signe
    // d'un club non reconnu plutôt que d'un simple report de date légitime
    // (où alors les DEUX équipes se retrouveraient à l'identique ailleurs).
    for (let i = 0; i < rows.length; i++) {
      for (let j = i + 1; j < rows.length; j++) {
        const a = rows[i], b = rows[j];
        const domMatch = clubsCorrespondent(a.equipe_domicile, b.equipe_domicile) || clubsCorrespondent(a.equipe_domicile, b.equipe_exterieur);
        const extMatch = clubsCorrespondent(a.equipe_exterieur, b.equipe_domicile) || clubsCorrespondent(a.equipe_exterieur, b.equipe_exterieur);
        if (domMatch && !extMatch) console.log(`    -> Suspect : "${a.equipe_domicile}"/"${b.equipe_domicile}" ou "${b.equipe_exterieur}" se recoupent, mais pas l'autre équipe — club non reconnu probable.`);
        else if (extMatch && !domMatch) console.log(`    -> Suspect : équipes extérieures se recoupent, mais pas l'équipe domicile — club non reconnu probable.`);
        else if (!domMatch && !extMatch) console.log(`    -> Aucun recoupement du tout entre id=${a.id} et id=${b.id} (probablement 2 vrais matchs différents, pas un doublon).`);
      }
    }
    totalSuspects++;
  }
}
console.log(`\n${totalSuspects} journée(s) suspecte(s) au total (toutes divisions).`);
