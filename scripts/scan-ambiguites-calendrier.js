// Diagnostic lecture seule : scanne TOUT calendrier_officiel (toutes
// divisions/saisons/groupes) pour détecter systématiquement les paires de
// noms d'équipe distincts qui sont jugées "ambiguës" par la même logique
// que generer-calendriers-existants.js (clubWordsMatch). Reproduit le même
// bug que celui rencontré pour Lorient B / Saint-Brieuc / Bayonne / Les
// Herbiers, afin de le corriger partout d'un coup plutôt qu'au fil des
// signalements.
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
  'berri chateauroux': { mots: ['lb', 'chateauroux'], elargi: false },
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

async function selectAll(table, columns) {
  const pageSize = 1000;
  let toutes = [];
  let page = 0;
  for (;;) {
    const { data, error } = await supabase.from(table).select(columns).range(page * pageSize, page * pageSize + pageSize - 1);
    if (error) { console.error(`Erreur lecture ${table} :`, error.message); process.exit(1); }
    toutes = toutes.concat(data || []);
    if (!data || data.length < pageSize) break;
    page++;
  }
  return toutes;
}

const calendrier = await selectAll('calendrier_officiel', 'equipe_domicile, equipe_exterieur, division, saison');
console.log(`${calendrier.length} ligne(s) calendrier_officiel au total.\n`);

// Regroupe les noms d'équipe distincts par (division, saison), avec compte
// d'occurrences pour prioriser (les paires à faible occurrence sont
// probablement les lignes orphelines/erronées).
const parContexte = new Map();
for (const r of calendrier) {
  const cle = `${r.division}|${r.saison}`;
  if (!parContexte.has(cle)) parContexte.set(cle, new Map());
  const equipes = parContexte.get(cle);
  for (const eq of [r.equipe_domicile, r.equipe_exterieur]) {
    if (!eq) continue;
    equipes.set(eq, (equipes.get(eq) || 0) + 1);
  }
}

let totalPaires = 0;
for (const [contexte, equipes] of parContexte) {
  const noms = [...equipes.keys()];
  const paires = [];
  for (let i = 0; i < noms.length; i++) {
    for (let j = i + 1; j < noms.length; j++) {
      if (noms[i] === noms[j]) continue;
      if (clubWordsMatch(noms[i], noms[j])) {
        paires.push([noms[i], noms[j]]);
      }
    }
  }
  if (paires.length) {
    console.log(`=== ${contexte} : ${paires.length} paire(s) ambiguë(s) ===`);
    for (const [a, b] of paires) {
      console.log(`  "${a}" (${equipes.get(a)} match(s)) ⟷ "${b}" (${equipes.get(b)} match(s))`);
    }
    totalPaires += paires.length;
  }
}
console.log(`\nTotal paires ambiguës détectées (toutes divisions/saisons) : ${totalPaires}`);
