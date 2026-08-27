// Audit complet (lecture seule) du calendrier N2 groupe H, saison
// 2026-2027, sur le modèle de verifie-calendriers-groupe-g.js :
// 1. Détection de doublons dans calendrier_officiel (paires de clubs
//    apparaissant plus de 2 fois).
// 2. Pour chacun des 13 clubs officiels connus (diagnostic-clubs-groupe-h.js),
//    vérifie que des joueurs existent et que chaque joueur a exactement le
//    bon nombre de matchs_joueur (0 hors-calendrier, 0 doublon).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const NIVEAU = 'N2';
const SAISON = '2026-2027';
const GROUPE = 'H';

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

const CLUBS_CONNUS = [
  'Aj Auxerre 2', 'Berri Chateauroux 2', 'Blois F. 41 1', 'Bretigny Fcs 1',
  'Corte 1', 'Fc St Jean Le Blanc 1', 'Gazelec Fc Ajaccio 1',
  'Linas Montlhery Esa 1', 'Paris Fc 2', 'So Romorantin 1',
  'Ste Genevieve Fc 1', 'Us Orleans 45 2', 'Vierzon Fc 1',
];

const { data: calendrier, error: errC } = await supabase.from('calendrier_officiel').select('id, equipe_domicile, equipe_exterieur, date_match').eq('division', NIVEAU).eq('groupe', GROUPE).eq('saison', SAISON);
if (errC) { console.error('Erreur calendrier :', errC.message); process.exit(1); }
console.log(`\n=== ${calendrier.length} ligne(s) calendrier_officiel (N2 groupe H, ${SAISON}) ===`);

console.log('\n--- 1. Détection de doublons (paires de clubs) ---');
const parPaire = {};
for (const row of calendrier) {
  const a = normalizeClub(row.equipe_domicile), b = normalizeClub(row.equipe_exterieur);
  const cle = [a, b].sort().join(' | ');
  (parPaire[cle] ||= []).push(row);
}
let nbPairesSuspectes = 0;
for (const [cle, rows] of Object.entries(parPaire)) {
  if (rows.length > 2) {
    console.log(`  SUSPECT : "${cle}" apparaît ${rows.length} fois :`);
    for (const r of rows) console.log(`    id=${r.id} "${r.equipe_domicile}" vs "${r.equipe_exterieur}" le ${r.date_match}`);
    nbPairesSuspectes++;
  }
}
console.log(`  ${nbPairesSuspectes} paire(s) suspecte(s) sur ${Object.keys(parPaire).length} paire(s) au total.`);

console.log('\n--- 2. Vérification par club (effectif + calendrier) ---');
const { data: joueursN2, error: errJ } = await supabase.from('joueurs').select('id, prenom, nom, club').eq('niveau', NIVEAU).eq('saison', SAISON);
if (errJ) { console.error('Erreur joueurs :', errJ.message); process.exit(1); }
console.log(`  (${joueursN2.length} joueur(s) N2 ${SAISON} au total, tous groupes confondus — ${joueursN2.length === 1000 ? 'ATTENTION : exactement 1000, possible troncature PostgREST !' : 'pas de troncature suspectée'})`);

let totalJoueursVerifies = 0;
let totalProblemes = 0;
for (const club of CLUBS_CONNUS) {
  const matchsClub = calendrier.filter((row) => clubWordsMatch(row.equipe_domicile, club) || clubWordsMatch(row.equipe_exterieur, club));
  const joueursClub = joueursN2.filter((j) => clubWordsMatch(j.club, club));

  if (!joueursClub.length) {
    console.log(`  ${club} : AUCUN JOUEUR TROUVÉ (club manquant en base) — ${matchsClub.length} ligne(s) calendrier existent pourtant.`);
    totalProblemes++;
    continue;
  }

  let problemesClub = 0;
  for (const j of joueursClub) {
    const { data: mj, error: errMj } = await supabase.from('matchs_joueur').select('id, calendrier_officiel_id').eq('joueur_id', j.id);
    if (errMj) { console.log(`    ${j.prenom} ${j.nom} : erreur ${errMj.message}`); continue; }
    const idsReels = new Set(matchsClub.map((m) => m.id));
    const horsCalendrier = mj.filter((m) => m.calendrier_officiel_id && !idsReels.has(m.calendrier_officiel_id));
    const idsVus = new Set();
    const doublons = mj.filter((m) => { if (!m.calendrier_officiel_id) return false; if (idsVus.has(m.calendrier_officiel_id)) return true; idsVus.add(m.calendrier_officiel_id); return false; });
    const ok = mj.length === matchsClub.length && !horsCalendrier.length && !doublons.length;
    if (!ok) {
      console.log(`    PROBLÈME ${j.prenom} ${j.nom} (${club}) : ${mj.length} matchs_joueur (attendu ${matchsClub.length}), ${horsCalendrier.length} hors-calendrier, ${doublons.length} doublon(s).`);
      problemesClub++;
    }
    totalJoueursVerifies++;
  }
  console.log(`  ${club} : ${joueursClub.length} joueur(s), ${matchsClub.length} ligne(s) calendrier — ${problemesClub === 0 ? 'OK' : `${problemesClub} PROBLÈME(S)`}`);
  totalProblemes += problemesClub;
}

console.log(`\n=== Résumé : ${totalJoueursVerifies} joueur(s) vérifié(s) sur ${CLUBS_CONNUS.length} club(s) connus, ${totalProblemes} problème(s) détecté(s). ===`);
