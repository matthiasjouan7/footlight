// Diagnostic (lecture seule) : reproduit fidèlement la logique de
// rapprochement club utilisée en production (footlight-modifier-profil.html
// : normalizeClub, CLUB_MOTS_GENERIQUES, CLUB_MOTS_REMPLACEMENT,
// CLUB_SYNONYMES_COMPLETS, clubWords, clubIdentitySignature,
// clubWordsElargi, clubWordsMatch) pour vérifier, avec le même code que
// "Générer mon calendrier", si chaque club de joueurs (niveau N2) matche
// bien un club de calendrier_officiel (division N2).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

// ── Copie fidèle de footlight-modifier-profil.html (lignes ~523-676) ──
function normalizeName(s) {
  return (s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim().replace(/\s+/g, ' ');
}
function normalizeClub(s) {
  return normalizeName(s)
    .replace(/[.'/-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s\d+$/, '');
}
const CLUB_MOTS_GENERIQUES = new Set([
  'fc','ofc','afc','asc','ac','sc','csc','cs','us','uso','as','ol','om','rc',
  'fco','osc','sco','ent','entente','athletic','olympique','football','club',
  'sporting','racing','stade',
  'sur','sous','en','la','le','les','de','du','des',
]);
const CLUB_MOTS_REMPLACEMENT = {
  st: 'saint',
  ste: 'sainte',
  gd: 'grand',
  philibert: 'philbert',
  virois: 'vire',
  bayonnais: 'bayonne',
  briochin: 'brieuc',
};
const CLUB_SYNONYMES_COMPLETS = {
  qrm: { mots: ['quevilly', 'rouen', 'metropole'], elargi: false },
  astdv: { mots: ['touques', 'deauville', 'trouville', 'villers'], elargi: true },
  alencon: { mots: ['alenconnaise', '61'], elargi: true },
  'anne sainte vertou': { mots: ['ussa'], elargi: true },
  'sables vf': { mots: ['sable', 'vendee'], elargi: false },
  'sable vendee': { mots: ['sable', 'vendee'], elargi: false },
  'sables vendee': { mots: ['sable', 'vendee'], elargi: false },
};
function clubWords(s) {
  const mots = normalizeClub(s).split(' ').filter(Boolean);
  const remplaces = mots.map(w => CLUB_MOTS_REMPLACEMENT[w] || w);
  const sansGeneriques = remplaces.filter(w => !CLUB_MOTS_GENERIQUES.has(w));
  return sansGeneriques.length ? sansGeneriques : remplaces;
}
function clubIdentitySignature(s) {
  const cle = clubWords(s).slice().sort().join(' ');
  const synonyme = CLUB_SYNONYMES_COMPLETS[cle];
  return synonyme ? synonyme.mots.slice().sort().join(' ') : cle;
}
function clubWordsElargi(s) {
  const mots = clubWords(s);
  const cle = mots.slice().sort().join(' ');
  const synonyme = CLUB_SYNONYMES_COMPLETS[cle];
  return (synonyme && synonyme.elargi) ? [...mots, ...synonyme.mots] : mots;
}
function clubWordsMatch(a, b) {
  const sigA = clubIdentitySignature(a), sigB = clubIdentitySignature(b);
  if (sigA && sigB && sigA === sigB) return true;
  const wa = clubWordsElargi(a), wb = clubWordsElargi(b);
  if (!wa.length || !wb.length) return false;
  const setA = new Set(wa), setB = new Set(wb);
  const small = wa.length <= wb.length ? setA : setB;
  const big = wa.length <= wb.length ? setB : setA;
  for (const w of small) if (!big.has(w)) return false;
  return true;
}
// ── Fin de la copie ──

async function selectAll(table, columns, filterColumn, filterValue) {
  const pageSize = 1000;
  let toutes = [];
  let page = 0;
  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .eq(filterColumn, filterValue)
      .range(page * pageSize, page * pageSize + pageSize - 1);
    if (error) { console.error(`Erreur lecture ${table} :`, error.message); process.exit(1); }
    toutes = toutes.concat(data || []);
    if (!data || data.length < pageSize) break;
    page++;
  }
  return toutes;
}

const joueurs = await selectAll('joueurs', 'club, niveau', 'niveau', 'N2');
const matchs = await selectAll('calendrier_officiel', 'equipe_domicile, equipe_exterieur', 'division', 'N2');

const clubsJoueurs = [...new Set((joueurs || []).map((j) => j.club).filter(Boolean))].sort();
const clubsCalendrier = [...new Set((matchs || []).flatMap((m) => [m.equipe_domicile, m.equipe_exterieur]).filter(Boolean))].sort();

console.log(`${clubsJoueurs.length} club(s) distinct(s) dans joueurs (niveau N2).`);
console.log(`${clubsCalendrier.length} club(s) distinct(s) dans calendrier_officiel (division N2).\n`);

console.log('--- Rapprochement club joueurs -> calendrier_officiel (logique EXACTE de production) ---');
for (const cj of clubsJoueurs) {
  const matchsTrouves = clubsCalendrier.filter((cc) => clubWordsMatch(cj, cc));
  if (matchsTrouves.length === 0) {
    console.log(`SANS CORRESPONDANCE : "${cj}" — aucun club du calendrier ne matche.`);
  } else if (matchsTrouves.length > 1) {
    console.log(`AMBIGU : "${cj}" matche plusieurs clubs calendrier : ${matchsTrouves.map((m) => `"${m}"`).join(', ')}`);
  } else {
    console.log(`OK : "${cj}" <-> "${matchsTrouves[0]}"`);
  }
}
