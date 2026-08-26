// Diagnostic lecture seule, systémique et généralisé (toutes divisions,
// pas seulement Ligue 3 comme scan-niveau-errone-ligue3.js) : l'utilisateur
// signale trop d'incohérences accumulées (joueurs transférés dont le
// niveau n'a pas suivi le changement de club), ce qui bloque ensuite toute
// génération de calendrier/synchro. Scanne TOUS les clubs connus dans
// calendrier_officiel (saison 2026-2027, toutes divisions/groupes) et
// liste tout joueur dont le club correspond à un club connu d'une division
// DIFFÉRENTE de son niveau déclaré.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

function normalizeName(s) { return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' '); }
function normalizeClub(s) { return normalizeName(s).replace(/[.'/-]/g, ' ').replace(/\s+/g, ' ').trim().replace(/\s\d{1,2}$/, ''); }
const CLUB_MOTS_GENERIQUES = new Set(['fc','ofc','afc','asc','ac','sc','csc','cs','us','uso','as','sa','sas','sr','srfa','ol','om','rc','fco','osc','sco','ent','entente','athletic','olympique','football','club','sporting','racing','stade','sur','sous','en','la','le','les','de','du','des']);
const CLUB_MOTS_REMPLACEMENT = { st: 'saint', ste: 'sainte', gd: 'grand', philibert: 'philbert', virois: 'vire', bayonnais: 'bayonne', briochin: 'brieuc', vfc: 'vendee', sbfc: 'beaucairois' };
function clubWords(s) {
  const mots = normalizeClub(s).split(' ').filter(Boolean).map((w) => CLUB_MOTS_REMPLACEMENT[w] || w);
  const sansGeneriques = mots.filter((w) => !CLUB_MOTS_GENERIQUES.has(w));
  return sansGeneriques.length ? sansGeneriques : mots;
}
function clubWordsMatch(a, b) {
  const wa = clubWords(a), wb = clubWords(b);
  if (!wa.length || !wb.length) return false;
  const setA = new Set(wa), setB = new Set(wb);
  const small = wa.length <= wb.length ? setA : setB;
  const big = wa.length <= wb.length ? setB : setA;
  for (const w of small) if (!big.has(w)) return false;
  return true;
}

async function selectAll(table, columns, filters) {
  const pageSize = 1000;
  let toutes = [];
  let page = 0;
  for (;;) {
    let q = supabase.from(table).select(columns).range(page * pageSize, page * pageSize + pageSize - 1);
    if (filters) q = filters(q);
    const { data, error } = await q;
    if (error) { console.error(`Erreur lecture ${table} :`, error.message); process.exit(1); }
    toutes = toutes.concat(data || []);
    if (!data || data.length < pageSize) break;
    page++;
  }
  return toutes;
}

const officiel = await selectAll('calendrier_officiel', 'equipe_domicile, equipe_exterieur, division, groupe', (q) => q.eq('saison', '2026-2027'));
console.log(`${officiel.length} ligne(s) calendrier_officiel (saison 2026-2027, toutes divisions).`);

// club (nom officiel) -> Set de "division|groupe"
const clubDivisions = new Map();
for (const r of officiel) {
  for (const nom of [r.equipe_domicile, r.equipe_exterieur]) {
    if (!nom) continue;
    const cle = normalizeClub(nom);
    if (!clubDivisions.has(cle)) clubDivisions.set(cle, { nom, divisions: new Set() });
    clubDivisions.get(cle).divisions.add(`${r.division}|${r.groupe || ''}`);
  }
}
const clubsConnus = [...clubDivisions.values()];
console.log(`${clubsConnus.length} club(s) distinct(s) connus dans calendrier_officiel.\n`);

const joueurs = await selectAll('joueurs', 'id, prenom, nom, club, niveau, matchs_joues', (q) => q.eq('saison', '2026-2027'));
console.log(`${joueurs.length} joueur(s) (saison 2026-2027) à vérifier.\n`);

console.log('=== Joueurs avec niveau probablement erroné (club connu dans une AUTRE division) ===');
let nbSuspects = 0;
for (const j of joueurs) {
  if (!j.club) continue;
  const match = clubsConnus.find((c) => clubWordsMatch(c.nom, j.club));
  if (!match) continue;
  const diviseurs = [...match.divisions].map((d) => d.split('|')[0]);
  const diviseursUniques = [...new Set(diviseurs)];
  if (diviseursUniques.includes(j.niveau)) continue; // niveau déjà cohérent avec au moins une des divisions trouvées
  console.log(`  ${j.prenom} ${j.nom} — club="${j.club}" (~ "${match.nom}") niveau déclaré="${j.niveau}" niveau(x) réel(s)="${diviseursUniques.join(', ')}" matchs_joues=${j.matchs_joues}`);
  nbSuspects++;
}
console.log(`\n${nbSuspects} joueur(s) suspect(s) trouvé(s) (toutes divisions confondues).`);
