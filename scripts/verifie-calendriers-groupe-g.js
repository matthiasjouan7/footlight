// Vérification complète, lecture seule, de tous les clubs N2 groupe G
// ajoutés cette session (14 clubs, dont Alès déjà en base auparavant).
// Deux contrôles :
// 1) Doublons dans calendrier_officiel (même paire d'équipes proche dans
//    le temps, comme le doublon Villefranche/Rouen id=3040 nettoyé plus
//    tôt) pour la division N2 groupe G.
// 2) Pour chaque joueur de ces clubs : son nombre de matchs_joueur doit
//    être exactement égal au nombre de lignes calendrier réelles pour son
//    club (26 attendu pour un groupe à 14 équipes), sans ligne hors
//    calendrier ni doublon de calendrier_officiel_id.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const SAISON = '2026-2027';
const NIVEAU = 'N2';
const GROUPE = 'G';

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

console.log('=== 1) Recherche de doublons dans calendrier_officiel (N2 groupe G) ===');
const calendrier = await selectAll('calendrier_officiel', 'id, equipe_domicile, equipe_exterieur, date_match', (q) => q.eq('division', NIVEAU).eq('groupe', GROUPE).eq('saison', SAISON));
console.log(`${calendrier.length} ligne(s) calendrier_officiel pour N2 groupe G.`);
const parPaire = new Map();
for (const r of calendrier) {
  const paire = [normalizeClub(r.equipe_domicile), normalizeClub(r.equipe_exterieur)].sort().join('|');
  if (!parPaire.has(paire)) parPaire.set(paire, []);
  parPaire.get(paire).push(r);
}
let nbDoublonsSuspects = 0;
for (const [paire, rows] of parPaire.entries()) {
  if (rows.length > 2) {
    console.log(`  SUSPECT (>2 lignes) : "${paire}" — ${rows.length} lignes :`);
    for (const r of rows) console.log(`    id=${r.id} — ${r.date_match} — ${r.equipe_domicile} vs ${r.equipe_exterieur}`);
    nbDoublonsSuspects++;
  }
}
console.log(`${nbDoublonsSuspects} paire(s) suspecte(s) (>2 lignes, doublon probable).`);

console.log('\n=== 2) Vérification des joueurs des 14 clubs N2 groupe G ===');
const CLUBS = [
  'Ales Ol 1', 'As St Etienne 2', 'Berre Sp.C. 1', 'Es Cannet Roche 1', 'Espaly 1',
  'Et.S. Fosseenne 1', 'Fc Rousset Ste Vict. 1', 'Gallia C. Lucciana 1', 'Mont. Atlas Paillade 1',
  'Montpellier Hsc 2', 'Olympique Marseille 2', 'Riviera Fc 1', 'Stade Beaucairois 30', 'Us Mandelieu Ln 1',
];

const joueurs = await selectAll('joueurs', 'id, prenom, nom, club, niveau', (q) => q.eq('saison', SAISON).eq('niveau', NIVEAU));

let totalJoueursVerifies = 0;
let totalProblemes = 0;
for (const clubOfficiel of CLUBS) {
  const idsReels = new Set(calendrier.filter((row) => clubWordsMatch(row.equipe_domicile, clubOfficiel) || clubWordsMatch(row.equipe_exterieur, clubOfficiel)).map((r) => r.id));
  const joueursClub = joueurs.filter((j) => clubWordsMatch(j.club, clubOfficiel));
  console.log(`\n${clubOfficiel} — ${idsReels.size} ligne(s) calendrier réelle(s), ${joueursClub.length} joueur(s) trouvé(s).`);
  let problemesClub = 0;
  for (const j of joueursClub) {
    const { data: matchs, error } = await supabase.from('matchs_joueur').select('calendrier_officiel_id').eq('joueur_id', j.id);
    if (error) { console.log(`  ${j.prenom} ${j.nom} : erreur lecture (${error.message})`); continue; }
    totalJoueursVerifies++;
    const idsJoueur = matchs.map((m) => m.calendrier_officiel_id);
    const horsCalendrier = idsJoueur.filter((id) => !idsReels.has(id));
    const compte = {};
    for (const id of idsJoueur) compte[id] = (compte[id] || 0) + 1;
    const doublons = Object.entries(compte).filter(([, n]) => n > 1);
    if (matchs.length !== idsReels.size || horsCalendrier.length || doublons.length) {
      console.log(`  PROBLÈME — ${j.prenom} ${j.nom} : ${matchs.length} match(s) (attendu ${idsReels.size}), ${horsCalendrier.length} hors calendrier, ${doublons.length} doublon(s) d'id.`);
      problemesClub++;
      totalProblemes++;
    }
  }
  if (!problemesClub) console.log('  OK — tous les joueurs ont le bon nombre de matchs, sans doublon ni ligne hors calendrier.');
}

console.log(`\n=== Résumé global ===`);
console.log(`${totalJoueursVerifies} joueur(s) vérifié(s) au total sur les 14 clubs.`);
console.log(`${totalProblemes} joueur(s) avec un problème détecté.`);
console.log(`${nbDoublonsSuspects} paire(s) de calendrier suspecte(s) (doublon probable).`);
