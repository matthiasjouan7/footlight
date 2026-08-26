// Diagnostic lecture seule, systémique : Ahmed Majid (AS Cannes) et Dembo
// Gassama (FC Villefranche Beaujolais) avaient tous deux un niveau erroné
// ("N1" au lieu de "Ligue 3"), ce qui bloquait tout calendrier/stats.
// Plutôt que de vérifier club par club au fil des signalements
// utilisateur, scanne TOUS les clubs Ligue 3 (saison 2026-2027, d'après
// calendrier_officiel) et liste tout joueur dont le club correspond à un
// club Ligue 3 connu mais dont le niveau déclaré est différent.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

function normalizeName(s) { return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' '); }
function normalizeClub(s) { return normalizeName(s).replace(/[.'/-]/g, ' ').replace(/\s+/g, ' ').trim().replace(/\s\d{1,2}$/, ''); }
const CLUB_MOTS_GENERIQUES = new Set(['fc','ofc','afc','asc','ac','sc','csc','cs','us','uso','as','sa','sas','sr','srfa','ol','om','rc','fco','osc','sco','ent','entente','athletic','olympique','football','club','sporting','racing','stade','sur','sous','en','la','le','les','de','du','des']);
const CLUB_MOTS_REMPLACEMENT = { st: 'saint', ste: 'sainte', gd: 'grand', philibert: 'philbert', virois: 'vire', bayonnais: 'bayonne', briochin: 'brieuc', vfc: 'vendee' };
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

const { data: officiel, error: errO } = await supabase
  .from('calendrier_officiel')
  .select('equipe_domicile, equipe_exterieur')
  .eq('saison', '2026-2027')
  .eq('division', 'Ligue 3');
if (errO) { console.error('Erreur calendrier :', errO.message); process.exit(1); }
const clubsLigue3 = [...new Set(officiel.flatMap((r) => [r.equipe_domicile, r.equipe_exterieur]))];
console.log(`${clubsLigue3.length} club(s) Ligue 3 distinct(s) dans calendrier_officiel.`);

const { data: joueurs, error: errJ } = await supabase
  .from('joueurs')
  .select('id, prenom, nom, club, niveau, matchs_joues')
  .eq('saison', '2026-2027')
  .neq('niveau', 'Ligue 3');
if (errJ) { console.error('Erreur joueurs :', errJ.message); process.exit(1); }
console.log(`${joueurs.length} joueur(s) (saison 2026-2027) avec un niveau différent de "Ligue 3".`);

console.log('\nJoueurs dont le club correspond à un club Ligue 3 connu (niveau probablement erroné) :');
let nbSuspects = 0;
for (const j of joueurs) {
  const clubMatch = clubsLigue3.find((c) => clubWordsMatch(c, j.club));
  if (clubMatch) {
    console.log(`  ${j.prenom} ${j.nom} — club="${j.club}" (~ "${clubMatch}") niveau déclaré="${j.niveau}" matchs_joues=${j.matchs_joues}`);
    nbSuspects++;
  }
}
console.log(`\n${nbSuspects} joueur(s) suspect(s) trouvé(s).`);
