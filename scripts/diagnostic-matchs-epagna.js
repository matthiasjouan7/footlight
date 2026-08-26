// Diagnostic lecture seule : l'utilisateur signale à raison que 31
// matchs_joueur pour Stany Epagna ne colle pas avec les 26 lignes réelles
// du calendrier N2 pour Vendée Fontenay Foot. Liste tous ses matchs_joueur
// actuels avec leur calendrier_officiel_id pour repérer les doublons ou
// lignes hors calendrier réel (même pattern que le nettoyage Sabihi :
// matchs d'un ancien club/ancienne ligue jamais nettoyés, ou doublons).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const JOUEUR_ID = '9b85b445-52eb-4794-a0a1-a2da7fa7eb4d'; // fiche conservée de Stany Epagna
const SAISON = '2026-2027';
const CLUB = 'Vendée Fontenay Foot';
const NIVEAU = 'N2';

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

const { data: calendrier, error: errC } = await supabase.from('calendrier_officiel').select('id, equipe_domicile, equipe_exterieur, date_match').eq('division', NIVEAU).eq('saison', SAISON);
if (errC) { console.error('Erreur calendrier :', errC.message); process.exit(1); }
const idsReels = new Set(calendrier.filter((row) => clubWordsMatch(row.equipe_domicile, CLUB) || clubWordsMatch(row.equipe_exterieur, CLUB)).map((r) => r.id));
console.log(`${idsReels.size} id(s) calendrier_officiel réel(s) pour ${CLUB} (${NIVEAU}).`);

const { data: matchs, error: errM } = await supabase.from('matchs_joueur').select('id, date_match, adversaire, domicile, calendrier_officiel_id').eq('joueur_id', JOUEUR_ID).order('date_match');
if (errM) { console.error('Erreur :', errM.message); process.exit(1); }
console.log(`\n${matchs.length} matchs_joueur au total pour cette fiche.\n`);

const compte = {};
for (const m of matchs) {
  const cle = String(m.calendrier_officiel_id);
  compte[cle] = (compte[cle] || 0) + 1;
}

for (const m of matchs) {
  const reel = idsReels.has(m.calendrier_officiel_id);
  const dup = compte[String(m.calendrier_officiel_id)] > 1;
  console.log(`  id=${m.id} — ${m.date_match} — vs ${m.adversaire} (${m.domicile ? 'domicile' : 'exterieur'}) — calendrier_officiel_id=${m.calendrier_officiel_id} — ${reel ? 'RÉEL' : 'HORS CALENDRIER N2'}${dup ? ' — DOUBLON' : ''}`);
}

const horsCalendrier = matchs.filter((m) => !idsReels.has(m.calendrier_officiel_id));
const doublons = matchs.filter((m) => compte[String(m.calendrier_officiel_id)] > 1);
console.log(`\n${horsCalendrier.length} ligne(s) hors calendrier N2 réel, ${doublons.length} ligne(s) en doublon (même calendrier_officiel_id).`);
