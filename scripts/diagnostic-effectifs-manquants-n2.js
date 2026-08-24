// Diagnostic lecture seule : le National 2 reprend ce week-end. Liste les
// équipes présentes dans calendrier_officiel (division N2, saison
// 2026-2027) et signale celles pour lesquelles aucun joueur n'est encore
// enregistré en base (effectif jamais ajouté), en réutilisant la même
// logique de rapprochement club que generer-calendriers-existants.js.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const SAISON = process.env.SAISON || '2026-2027';

// ── Copie du rapprochement club (generer-calendriers-existants.js) ──
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

async function selectAll(table, colonnes, filtre) {
  let tous = [];
  let debut = 0;
  const TAILLE_PAGE = 1000;
  for (;;) {
    let q = supabase.from(table).select(colonnes).range(debut, debut + TAILLE_PAGE - 1);
    if (filtre) q = filtre(q);
    const { data, error } = await q;
    if (error) { console.error(`Erreur lecture ${table} :`, error.message); process.exit(1); }
    tous = tous.concat(data || []);
    if (!data || data.length < TAILLE_PAGE) break;
    debut += TAILLE_PAGE;
  }
  return tous;
}

const calendrier = await selectAll('calendrier_officiel', 'equipe_domicile, equipe_exterieur, groupe, date_match', (q) => q.eq('division', 'N2').eq('saison', SAISON));
console.log(`Lignes calendrier_officiel N2 saison ${SAISON} : ${calendrier.length}`);

const equipesParGroupe = new Map();
for (const r of calendrier) {
  for (const equipe of [r.equipe_domicile, r.equipe_exterieur]) {
    const cle = `${r.groupe}|${equipe}`;
    if (!equipesParGroupe.has(cle)) equipesParGroupe.set(cle, { groupe: r.groupe, equipe, premiereDate: r.date_match });
    else if (r.date_match < equipesParGroupe.get(cle).premiereDate) equipesParGroupe.get(cle).premiereDate = r.date_match;
  }
}
const equipes = [...equipesParGroupe.values()].sort((a, b) => a.groupe.localeCompare(b.groupe) || a.equipe.localeCompare(b.equipe));
console.log(`Équipes distinctes (tous groupes confondus) : ${equipes.length}`);

const joueurs = await selectAll('joueurs', 'id, club, niveau, saison', (q) => q.eq('saison', SAISON));
const joueursN2 = joueurs.filter((j) => j.niveau === 'N2');
console.log(`Joueurs enregistrés niveau N2 saison ${SAISON} : ${joueursN2.length}`);

console.log(`\n=== Équipes N2 SANS AUCUN joueur enregistré (effectif jamais ajouté) ===`);
let manquantes = 0;
for (const { groupe, equipe, premiereDate } of equipes) {
  const aDesJoueurs = joueursN2.some((j) => clubWordsMatch(j.club, equipe));
  if (!aDesJoueurs) {
    manquantes++;
    console.log(`  Groupe ${groupe} — ${equipe} (1er match connu : ${premiereDate || '?'})`);
  }
}
console.log(`\nTotal équipes sans effectif : ${manquantes} / ${equipes.length}`);

console.log(`\n=== Pour référence : équipes AVEC déjà des joueurs (nombre de joueurs) ===`);
for (const { groupe, equipe } of equipes) {
  const n = joueursN2.filter((j) => clubWordsMatch(j.club, equipe)).length;
  if (n > 0) console.log(`  Groupe ${groupe} — ${equipe} : ${n} joueur(s)`);
}
