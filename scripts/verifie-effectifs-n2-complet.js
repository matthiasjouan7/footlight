// Audit complet (lecture seule) de TOUTE la division N2, saison
// 2026-2027, tous groupes confondus : pour chaque groupe présent dans
// calendrier_officiel, liste tous les clubs officiels qu'il contient et
// vérifie si un effectif existe en base pour chacun (clubWordsMatch, comme
// le fait le site). Signale les clubs sans aucun joueur.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const NIVEAU = 'N2';
const SAISON = '2026-2027';

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

// Pagination complète (le plafond par défaut PostgREST est 1000 lignes).
async function fetchAll(table, select, filters) {
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    let q = supabase.from(table).select(select);
    for (const [col, val] of Object.entries(filters)) q = q.eq(col, val);
    const { data, error } = await q.range(offset, offset + 999);
    if (error) { console.error(`Erreur ${table} :`, error.message); process.exit(1); }
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows;
}

const calendrier = await fetchAll('calendrier_officiel', 'id, groupe, equipe_domicile, equipe_exterieur', { division: NIVEAU, saison: SAISON });
console.log(`\n=== ${calendrier.length} ligne(s) calendrier_officiel N2 ${SAISON}, tous groupes confondus ===`);

const groupes = [...new Set(calendrier.map((r) => r.groupe))].sort();
console.log(`Groupes présents : ${groupes.join(', ')}`);

const joueursN2 = await fetchAll('joueurs', 'id, prenom, nom, club', { niveau: NIVEAU, saison: SAISON });
console.log(`${joueursN2.length} joueur(s) N2 ${SAISON} en base (tous groupes confondus, pagination complète).\n`);

let totalClubs = 0;
let totalClubsManquants = 0;
const recap = [];

for (const groupe of groupes) {
  const lignesGroupe = calendrier.filter((r) => r.groupe === groupe);
  const clubsGroupe = [...new Set(lignesGroupe.flatMap((r) => [r.equipe_domicile, r.equipe_exterieur]))].sort();
  console.log(`--- Groupe ${groupe} : ${clubsGroupe.length} club(s) officiel(s), ${lignesGroupe.length} ligne(s) calendrier ---`);

  const manquants = [];
  for (const club of clubsGroupe) {
    totalClubs++;
    const joueursClub = joueursN2.filter((j) => clubWordsMatch(j.club, club));
    if (!joueursClub.length) {
      manquants.push(club);
      totalClubsManquants++;
    }
  }
  if (manquants.length) {
    console.log(`  MANQUANT(S) (${manquants.length}) : ${manquants.join(' | ')}`);
  } else {
    console.log('  Tous les clubs ont un effectif.');
  }
  recap.push({ groupe, total: clubsGroupe.length, manquants: manquants.length, nomsManquants: manquants });
}

console.log(`\n=== Résumé global ===`);
console.log(`${groupes.length} groupe(s) N2, ${totalClubs} club(s) officiel(s) au total, ${totalClubsManquants} club(s) SANS AUCUN JOUEUR en base.`);
for (const r of recap) {
  console.log(`  Groupe ${r.groupe} : ${r.total} club(s), ${r.manquants} manquant(s)${r.manquants ? ` -> ${r.nomsManquants.join(' | ')}` : ''}`);
}
