// Diagnostic (lecture seule) : liste les clubs distincts du calendrier
// officiel pour National 2 groupe C (fraîchement saisi) et détecte les
// paires de noms qui semblent désigner le même club sous deux graphies
// différentes (ex: "Biesheim" / "BIESHEIM ASC"), pour repérer les
// incohérences de nommage avant qu'elles ne posent problème (rapprochement
// avec la table joueurs, doublons de match non détectés faute de même date).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

function normaliser(str) {
  return (str || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[.'/-]/g, ' ').replace(/\s+/g, ' ').trim();
}
const MOTS_GENERIQUES = new Set(['fc', 'ofc', 'afc', 'asc', 'ac', 'sc', 'csc', 'cs', 'us', 'uso', 'as', 'sm', 'sa', 'football', 'club', 'sporting', 'racing', 'stade', 'olympique', 'efc', 'srfa', 'sur', 'sous', 'en', 'la', 'le', 'les', 'de', 'du', 'des']);
function motsClub(s) {
  const mots = normaliser(s).split(' ').filter(Boolean).filter((w) => !MOTS_GENERIQUES.has(w));
  return mots.length ? mots : normaliser(s).split(' ').filter(Boolean);
}
function clubsCorrespondent(a, b) {
  const wa = new Set(motsClub(a)), wb = new Set(motsClub(b));
  if (!wa.size || !wb.size) return false;
  const [small, big] = wa.size <= wb.size ? [wa, wb] : [wb, wa];
  for (const w of small) if (!big.has(w)) return false;
  return true;
}

const { data, error } = await supabase
  .from('calendrier_officiel')
  .select('journee, equipe_domicile, equipe_exterieur, date_match, saison')
  .eq('division', 'N2')
  .eq('groupe', 'C');
if (error) { console.error('Erreur lecture calendrier_officiel :', error.message); process.exit(1); }

const saisons = [...new Set((data || []).map((m) => m.saison))].sort();
const clubs = [...new Set((data || []).flatMap((m) => [m.equipe_domicile, m.equipe_exterieur]).filter(Boolean))].sort();
const journees = [...new Set((data || []).map((m) => m.journee))].filter((j) => j != null).sort((a, b) => a - b);

console.log(`${data.length} match(s) trouvé(s) pour National 2 groupe C (saison(s) : ${saisons.join(', ') || 'aucune'}).`);
console.log(`Journée(s) : ${journees.join(', ') || 'aucune'}`);
console.log(`${clubs.length} club(s) distinct(s) :`);
for (const c of clubs) console.log(`  "${c}"`);

console.log('\n--- Matchs sans date ---');
const sansDate = (data || []).filter((m) => !m.date_match);
console.log(`${sansDate.length} match(s) sans date_match.`);
for (const m of sansDate) console.log(`  J${m.journee} : ${m.equipe_domicile} vs ${m.equipe_exterieur}`);

console.log('\n--- Paires de noms potentiellement identiques ---');
let nbPaires = 0;
for (let i = 0; i < clubs.length; i++) {
  for (let j = i + 1; j < clubs.length; j++) {
    if (clubsCorrespondent(clubs[i], clubs[j])) {
      console.log(`AMBIGU : "${clubs[i]}" vs "${clubs[j]}"`);
      nbPaires++;
    }
  }
}
console.log(`\n${nbPaires} paire(s) ambiguë(s) détectée(s).`);
