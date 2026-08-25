// Diagnostic lecture seule : le précédent recheck n'a trouvé aucun joueur
// pour les noms exacts "FC LORIENT 2" / "Les Herbiers" / "LES HERBIERS VF"
// (seuls Stade Briochin et Aviron Bayonnais FC avaient des joueurs sous
// ces noms exacts). Utilise le rapprochement flou (clubWordsMatch) comme
// le fait le site, pour retrouver les vrais noms de club utilisés côté
// joueurs, et vérifie pour TOUS les joueurs (pas un échantillon) le
// nombre de lignes matchs_joueur, le min/max des dates, et le compte de
// lignes avec un score déjà connu (score_pour non nul).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

function normalizeName(s) { return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' '); }
function normalizeClub(s) { return normalizeName(s).replace(/[.'/-]/g, ' ').replace(/\s+/g, ' ').trim().replace(/\s\d{1,2}$/, ''); }
const CLUB_MOTS_GENERIQUES = new Set(['fc','ofc','afc','asc','ac','sc','csc','cs','us','uso','as','ol','om','rc','fco','osc','sco','ent','entente','athletic','olympique','football','club','sporting','racing','stade','sur','sous','en','la','le','les','de','du','des']);
const CLUB_MOTS_REMPLACEMENT = { st: 'saint', ste: 'sainte', gd: 'grand', philibert: 'philbert', virois: 'vire', bayonnais: 'bayonne', briochin: 'brieuc' };
function clubWords(s) {
  const mots = normalizeClub(s).split(' ').filter(Boolean);
  const remplaces = mots.map((w) => CLUB_MOTS_REMPLACEMENT[w] || w);
  const sansGeneriques = remplaces.filter((w) => !CLUB_MOTS_GENERIQUES.has(w));
  return sansGeneriques.length ? sansGeneriques : remplaces;
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

const CIBLES = ['Lorient', 'Herbiers'];

const { data: joueurs, error } = await supabase.from('joueurs').select('id, prenom, nom, club, niveau, saison').eq('saison', '2026-2027');
if (error) { console.error('Erreur joueurs :', error.message); process.exit(1); }

for (const cible of CIBLES) {
  const trouves = joueurs.filter((j) => clubWordsMatch(j.club, cible));
  const clubsDistincts = [...new Set(trouves.map((j) => j.club))];
  console.log(`\n=== Recherche floue "${cible}" : ${trouves.length} joueur(s), clubs exacts trouvés : ${clubsDistincts.join(', ') || '(aucun)'} ===`);
  let sansMatchs = 0;
  let dateMin = null, dateMax = null, avecScore = 0, total = 0;
  for (const j of trouves) {
    const { data: matchs, error: errM, count } = await supabase
      .from('matchs_joueur')
      .select('date_match, score_pour', { count: 'exact' })
      .eq('joueur_id', j.id);
    if (errM) { console.error(`  Erreur pour ${j.prenom} ${j.nom} :`, errM.message); continue; }
    if (!count) { sansMatchs++; continue; }
    total += count;
    for (const m of matchs) {
      if (!dateMin || m.date_match < dateMin) dateMin = m.date_match;
      if (!dateMax || m.date_match > dateMax) dateMax = m.date_match;
      if (m.score_pour != null) avecScore++;
    }
  }
  console.log(`  Joueurs SANS aucune ligne matchs_joueur : ${sansMatchs} / ${trouves.length}`);
  console.log(`  Dates min/max des matchs_joueur : ${dateMin || '?'} → ${dateMax || '?'}`);
  console.log(`  Lignes avec score déjà connu : ${avecScore} / ${total}`);
}
