// Diagnostic lecture seule : reproduit EXACTEMENT la logique de
// rapprochement club de generer-calendriers-existants.js pour les joueurs
// de Stade Briochin, Aviron Bayonnais FC et Les Herbiers VF (signalés sans
// stats), afin de voir précisément quels candidats calendrier_officiel
// l'algorithme trouve (et pourquoi il les juge ambigus, le cas échéant).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

// ── Copie fidèle de generer-calendriers-existants.js ──
function normalizeName(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}
function normalizeClub(s) {
  return normalizeName(s).replace(/[.'/-]/g, ' ').replace(/\s+/g, ' ').trim().replace(/\s\d{1,2}$/, '');
}
const CLUB_MOTS_GENERIQUES = new Set([
  'fc','ofc','afc','asc','ac','sc','csc','cs','us','uso','as','ol','om','rc',
  'fco','osc','sco','ent','entente','athletic','olympique','football','club',
  'sporting','racing','stade',
  'sur','sous','en','la','le','les','de','du','des',
]);
const CLUB_MOTS_REMPLACEMENT = {
  st: 'saint', ste: 'sainte', gd: 'grand', philibert: 'philbert',
  virois: 'vire', bayonnais: 'bayonne', briochin: 'brieuc',
};
const CLUB_SYNONYMES_COMPLETS = {
  qrm: { mots: ['quevilly', 'rouen', 'metropole'], elargi: false },
  astdv: { mots: ['touques', 'deauville', 'trouville', 'villers'], elargi: true },
  alencon: { mots: ['alenconnaise', '61'], elargi: true },
  'anne sainte vertou': { mots: ['ussa'], elargi: true },
  'sables vf': { mots: ['sable', 'vendee'], elargi: false },
  'sable vendee': { mots: ['sable', 'vendee'], elargi: false },
  'sables vendee': { mots: ['sable', 'vendee'], elargi: false },
  'bourgoin j': { mots: ['jallieu'], elargi: true },
  'romorantin so': { mots: ['sologne'], elargi: true },
  // Locminé/Angoulême/Tarbes/Chateaubriant/Grand Ouest Lyonnais : calendrier_officiel
  // utilise des abréviations non reconnues par CLUB_MOTS_REMPLACEMENT pour ces
  // clubs précis (constaté en pratique : joueurs bloqués à 1-3 matchs alors que
  // le calendrier complet existe sous ce nom abrégé).
  'co locmine saint': { mots: ['colomban', 'locmine', 'saint'], elargi: false },
  'angouleme chte': { mots: ['angouleme', 'charente'], elargi: false },
  'pf tarbes': { mots: ['pyrenees', 'tarbes'], elargi: false },
  'chateaubriant volt': { mots: ['voltigeurs', 'chateaubriant'], elargi: false },
  'associat grand ouest': { mots: ['grand', 'ouest', 'association', 'lyonnaise'], elargi: false },
};
function clubWords(s) {
  const mots = normalizeClub(s).split(' ').filter(Boolean);
  const remplaces = mots.map((w) => CLUB_MOTS_REMPLACEMENT[w] || w);
  const sansGeneriques = remplaces.filter((w) => !CLUB_MOTS_GENERIQUES.has(w));
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

const CIBLES = [
  { club: 'Stade Briochin', niveau: 'N1' },
  { club: 'Aviron Bayonnais FC', niveau: 'N1' },
  { club: 'Les Herbiers VF', niveau: 'N1' },
];
const SAISON = '2026-2027';

const { data: calendrier, error } = await supabase
  .from('calendrier_officiel')
  .select('id, saison, division, equipe_domicile, equipe_exterieur')
  .eq('saison', SAISON)
  .eq('division', 'N1');
if (error) { console.error('Erreur lecture calendrier_officiel :', error.message); process.exit(1); }
console.log(`${calendrier.length} ligne(s) calendrier_officiel N1 ${SAISON}.\n`);

for (const cible of CIBLES) {
  const matchsClub = calendrier.filter((row) => clubWordsMatch(row.equipe_domicile, cible.club) || clubWordsMatch(row.equipe_exterieur, cible.club));
  console.log(`=== ${cible.club} (signature="${clubIdentitySignature(cible.club)}", mots=${JSON.stringify(clubWordsElargi(cible.club))}) ===`);
  console.log(`  ${matchsClub.length} ligne(s) calendrier correspondante(s).`);
  const rencontres = new Map();
  for (const row of matchsClub) {
    if (clubWordsMatch(row.equipe_domicile, cible.club)) rencontres.set(clubIdentitySignature(row.equipe_domicile), row.equipe_domicile);
    if (clubWordsMatch(row.equipe_exterieur, cible.club)) rencontres.set(clubIdentitySignature(row.equipe_exterieur), row.equipe_exterieur);
  }
  console.log(`  Rencontres distinctes (signature → nom) : ${rencontres.size}`);
  for (const [sig, nom] of rencontres) console.log(`    "${sig}" → "${nom}"`);
  console.log('');
}
