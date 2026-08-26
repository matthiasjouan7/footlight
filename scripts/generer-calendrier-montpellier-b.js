// Rattrapage calendrier groupé pour l'effectif Montpellier HSC B — même
// modèle que generer-calendrier-om-b.js / st-etienne-b.js.
// Sécurité : DRY_RUN=true par défaut, anti-doublon sur calendrier_officiel_id/date.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const CLUB = 'Montpellier Hsc 2';
const NIVEAU = 'N2';
const SAISON = '2026-2027';
const GROUPE = 'G';

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

const { data: joueurs, error: errJ } = await supabase.from('joueurs').select('id, prenom, nom').eq('club', CLUB).eq('niveau', NIVEAU).eq('saison', SAISON);
if (errJ) { console.error('Erreur joueurs :', errJ.message); process.exit(1); }
console.log(`${joueurs.length} joueur(s) trouvé(s) pour ${CLUB}.`);

const { data: calendrier, error: errC } = await supabase
  .from('calendrier_officiel')
  .select('id, equipe_domicile, equipe_exterieur, date_match')
  .eq('division', NIVEAU)
  .eq('groupe', GROUPE)
  .eq('saison', SAISON);
if (errC) { console.error('Erreur calendrier :', errC.message); process.exit(1); }
const matchsClub = calendrier.filter((row) => clubWordsMatch(row.equipe_domicile, CLUB) || clubWordsMatch(row.equipe_exterieur, CLUB));
console.log(`${matchsClub.length} ligne(s) calendrier correspondante(s) pour ${CLUB}.\n`);

let totalInseres = 0;
for (const j of joueurs) {
  const { data: existants, error: errE } = await supabase.from('matchs_joueur').select('calendrier_officiel_id, date_match').eq('joueur_id', j.id);
  if (errE) { console.log(`${j.prenom} ${j.nom} : erreur lecture existants (${errE.message})`); continue; }
  const idsExistants = new Set((existants || []).filter((m) => m.calendrier_officiel_id).map((m) => String(m.calendrier_officiel_id)));
  const datesExistantes = new Set((existants || []).map((m) => m.date_match));

  const aInserer = matchsClub.filter((row) => !idsExistants.has(String(row.id)) && !datesExistantes.has(row.date_match)).map((row) => {
    const domicile = clubWordsMatch(row.equipe_domicile, CLUB);
    return {
      joueur_id: j.id,
      saison: SAISON,
      date_match: row.date_match,
      adversaire: domicile ? row.equipe_exterieur : row.equipe_domicile,
      competition: 'championnat',
      domicile,
      verifie: true,
      calendrier_officiel_id: row.id,
    };
  });
  console.log(`${j.prenom} ${j.nom} : ${aInserer.length} match(s) à insérer.`);
  totalInseres += aInserer.length;
  if (!dryRun && aInserer.length) {
    const { error: insErr } = await supabase.from('matchs_joueur').insert(aInserer);
    if (insErr) console.log(`  Erreur insertion : ${insErr.message}`);
  }
}

console.log(`\nRésumé : ${totalInseres} match(s) ${dryRun ? 'à insérer' : 'inséré(s)'} au total.`);
if (dryRun) console.log('DRY RUN : rien n\'a été écrit.');
