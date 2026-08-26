// Rattrapage ciblé pour Kamil Bensoula uniquement, pour éviter de dépendre
// du scan complet generer-calendriers-existants.js (instable en
// performance). Reproduit la même logique de rapprochement, avec le
// correctif vfc→vendee ajouté dans les 5 copies de la logique de
// rapprochement (VFC La Roche-sur-Yon ↔ VENDEE FC LA ROCHE/YON).
// Sécurité : DRY_RUN=true par défaut, anti-doublon sur calendrier_officiel_id/date.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const JOUEUR_ID = '0420f770-0ed6-492b-a517-42ff8283b167';

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

const { data: joueur, error: errJ } = await supabase.from('joueurs').select('id, prenom, nom, club, niveau, saison').eq('id', JOUEUR_ID).single();
if (errJ) { console.error('Erreur joueur :', errJ.message); process.exit(1); }
console.log(`Joueur : ${joueur.prenom} ${joueur.nom} — club="${joueur.club}" niveau=${joueur.niveau} saison=${joueur.saison}`);

const { data: calendrier, error: errC } = await supabase
  .from('calendrier_officiel')
  .select('id, equipe_domicile, equipe_exterieur, division, saison, date_match')
  .eq('division', joueur.niveau)
  .eq('saison', joueur.saison);
if (errC) { console.error('Erreur calendrier :', errC.message); process.exit(1); }

const matchsClub = calendrier.filter((row) => clubWordsMatch(row.equipe_domicile, joueur.club) || clubWordsMatch(row.equipe_exterieur, joueur.club));
console.log(`${matchsClub.length} ligne(s) calendrier correspondante(s) trouvée(s).`);

const { data: existants, error: errE } = await supabase.from('matchs_joueur').select('calendrier_officiel_id, date_match').eq('joueur_id', JOUEUR_ID);
if (errE) { console.error('Erreur matchs_joueur existants :', errE.message); process.exit(1); }
const idsExistants = new Set(existants.filter((m) => m.calendrier_officiel_id).map((m) => String(m.calendrier_officiel_id)));
const datesExistantes = new Set(existants.map((m) => m.date_match));

const aInserer = matchsClub.filter((row) => !idsExistants.has(String(row.id)) && !datesExistantes.has(row.date_match)).map((row) => {
  const domicile = clubWordsMatch(row.equipe_domicile, joueur.club);
  return {
    joueur_id: JOUEUR_ID,
    saison: joueur.saison,
    date_match: row.date_match,
    adversaire: domicile ? row.equipe_exterieur : row.equipe_domicile,
    competition: 'championnat',
    domicile,
    verifie: true,
    calendrier_officiel_id: row.id,
  };
});
console.log(`${aInserer.length} match(s) à insérer.`);

if (!dryRun && aInserer.length) {
  const { error: insErr } = await supabase.from('matchs_joueur').insert(aInserer);
  if (insErr) { console.error('Erreur insertion :', insErr.message); process.exit(1); }
  console.log('Terminé.');
} else if (dryRun) {
  console.log('DRY RUN : rien n\'a été écrit.');
}
