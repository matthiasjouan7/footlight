// Fusionne le doublon Stany Epagna (Vendée Fontenay Foot) confirmé par
// diagnostic-aboubacar-epagna.js : deux fiches pour la même personne,
// l'une incomplète (niveau N1, pas de date de naissance, 0 matchs) et
// l'autre complète (niveau N2, née le 07/06/1995). Migre les éventuels
// matchs_joueur de la fiche incomplète vers la complète (au cas où),
// supprime la fiche incomplète, puis génère le calendrier réel (N2) pour
// la fiche conservée.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const SAISON = '2026-2027';
const CLUB = 'Vendée Fontenay Foot';
const NIVEAU = 'N2';
const ID_INCOMPLET = '6684d0b1-3234-4202-a8e4-96dca8fa416d'; // niveau N1, sans date de naissance
const ID_COMPLET = '9b85b445-52eb-4794-a0a1-a2da7fa7eb4d'; // niveau N2, né 1995-06-07

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

console.log('=== Vérification matchs_joueur de la fiche incomplète ===');
const { data: matchsIncomplet, error: errM } = await supabase.from('matchs_joueur').select('id, calendrier_officiel_id, date_match').eq('joueur_id', ID_INCOMPLET);
if (errM) { console.error('Erreur :', errM.message); process.exit(1); }
console.log(`${matchsIncomplet.length} ligne(s) matchs_joueur trouvée(s) pour la fiche incomplète.`);
if (matchsIncomplet.length) {
  const { data: matchsComplet, error: errMC } = await supabase.from('matchs_joueur').select('calendrier_officiel_id').eq('joueur_id', ID_COMPLET);
  if (errMC) { console.error('Erreur :', errMC.message); process.exit(1); }
  const idsDejaPresents = new Set(matchsComplet.map((m) => m.calendrier_officiel_id));
  const aMigrer = matchsIncomplet.filter((m) => !idsDejaPresents.has(m.calendrier_officiel_id));
  console.log(`  ${aMigrer.length} ligne(s) à migrer vers la fiche complète.`);
  if (!dryRun && aMigrer.length) {
    const { error: updErr } = await supabase.from('matchs_joueur').update({ joueur_id: ID_COMPLET }).in('id', aMigrer.map((m) => m.id));
    if (updErr) { console.error('Erreur migration :', updErr.message); process.exit(1); }
  }
  const aSupprimer = matchsIncomplet.filter((m) => idsDejaPresents.has(m.calendrier_officiel_id));
  if (!dryRun && aSupprimer.length) {
    const { error: delErr } = await supabase.from('matchs_joueur').delete().in('id', aSupprimer.map((m) => m.id));
    if (delErr) { console.error('Erreur suppression doublons matchs :', delErr.message); process.exit(1); }
  }
}

console.log('\n=== Suppression de la fiche incomplète ===');
if (!dryRun) {
  const { error: delJErr } = await supabase.from('joueurs').delete().eq('id', ID_INCOMPLET);
  if (delJErr) { console.error('Erreur suppression joueur :', delJErr.message); process.exit(1); }
  console.log('  Fiche incomplète supprimée.');
} else {
  console.log('  (DRY RUN) Fiche incomplète à supprimer.');
}

console.log('\n=== Calendrier de la fiche conservée ===');
const { data: calendrier, error: errC } = await supabase.from('calendrier_officiel').select('id, equipe_domicile, equipe_exterieur, date_match').eq('division', NIVEAU).eq('saison', SAISON);
if (errC) { console.error('Erreur calendrier :', errC.message); process.exit(1); }
const matchsClub = calendrier.filter((row) => clubWordsMatch(row.equipe_domicile, CLUB) || clubWordsMatch(row.equipe_exterieur, CLUB));
console.log(`${matchsClub.length} ligne(s) calendrier correspondante(s) pour ${CLUB}.`);

const { data: existants, error: errE } = await supabase.from('matchs_joueur').select('calendrier_officiel_id, date_match').eq('joueur_id', ID_COMPLET);
if (errE) { console.error('Erreur lecture existants :', errE.message); process.exit(1); }
const idsExistants = new Set((existants || []).filter((m) => m.calendrier_officiel_id).map((m) => String(m.calendrier_officiel_id)));
const datesExistantes = new Set((existants || []).map((m) => m.date_match));
const aInserer = matchsClub.filter((row) => !idsExistants.has(String(row.id)) && !datesExistantes.has(row.date_match)).map((row) => {
  const domicile = clubWordsMatch(row.equipe_domicile, CLUB);
  return {
    joueur_id: ID_COMPLET, saison: SAISON, date_match: row.date_match,
    adversaire: domicile ? row.equipe_exterieur : row.equipe_domicile,
    competition: 'championnat', domicile, verifie: true, calendrier_officiel_id: row.id,
  };
});
console.log(`${aInserer.length} match(s) ${dryRun ? 'à insérer' : 'inséré(s)'}.`);
if (!dryRun && aInserer.length) {
  const { error: insErr } = await supabase.from('matchs_joueur').insert(aInserer);
  if (insErr) console.log(`Erreur insertion : ${insErr.message}`);
}
if (dryRun) console.log('\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
