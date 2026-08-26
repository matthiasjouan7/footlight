// Diagnostic lecture seule : avant d'ajouter 'sa','sas','sr','srfa' comme
// mots génériques dans la logique de rapprochement club (correctif
// Épinal/Colmar), vérifie qu'aucun autre couple de clubs réels distincts
// de calendrier_officiel ne se retrouve avec la même signature une fois
// ces mots ignorés (même précédent que Metz/Dijon -> CLUB_PAIRES_DISTINCTES).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

// ── Copie fidèle (avec le correctif) de generer-calendriers-existants.js ──
function normalizeName(s) { return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' '); }
function normalizeClub(s) { return normalizeName(s).replace(/[.'/-]/g, ' ').replace(/\s+/g, ' ').trim().replace(/\s\d{1,2}$/, ''); }
const CLUB_MOTS_GENERIQUES = new Set([
  'fc', 'ofc', 'afc', 'asc', 'ac', 'sc', 'csc', 'cs', 'us', 'uso', 'as', 'sa', 'sas',
  'sr', 'srfa', 'ol', 'om', 'rc',
  'fco', 'osc', 'sco', 'ent', 'entente', 'athletic', 'olympique', 'football', 'club',
  'sporting', 'racing', 'stade',
  'sur', 'sous', 'en', 'la', 'le', 'les', 'de', 'du', 'des',
]);
const CLUB_MOTS_REMPLACEMENT = {
  st: 'saint', ste: 'sainte', gd: 'grand', philibert: 'philbert',
  virois: 'vire', bayonnais: 'bayonne', briochin: 'brieuc',
};
function clubWords(s) {
  const mots = normalizeClub(s).split(' ').filter(Boolean);
  const remplaces = mots.map((w) => CLUB_MOTS_REMPLACEMENT[w] || w);
  let sansGeneriques = remplaces.filter((w) => !CLUB_MOTS_GENERIQUES.has(w));
  if (sansGeneriques.includes('hyeres')) sansGeneriques = sansGeneriques.filter((w) => w !== '83');
  return sansGeneriques.length ? sansGeneriques : remplaces;
}
function signature(s) { return clubWords(s).slice().sort().join(' '); }
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

const rows = await selectAll('calendrier_officiel', 'equipe_domicile, equipe_exterieur');
const noms = new Set();
for (const r of rows) { if (r.equipe_domicile) noms.add(r.equipe_domicile); if (r.equipe_exterieur) noms.add(r.equipe_exterieur); }

const parSignature = new Map();
for (const nom of noms) {
  const sig = signature(nom);
  if (!parSignature.has(sig)) parSignature.set(sig, new Set());
  parSignature.get(sig).add(nom);
}

console.log(`${noms.size} nom(s) d'équipe distinct(s) dans calendrier_officiel.`);
let nbCollisions = 0;
for (const [sig, ensemble] of parSignature) {
  if (ensemble.size > 1) {
    nbCollisions++;
    console.log(`COLLISION signature="${sig}" : ${[...ensemble].join(' | ')}`);
  }
}
console.log(`\n${nbCollisions} signature(s) partagée(s) par plusieurs noms distincts.`);
