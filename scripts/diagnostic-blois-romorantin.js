// Diagnostic : vérifie l'état en base de Blois F. 41 et So Romorantin
// (N2 groupe H) — l'utilisateur indique qu'ils sont déjà en base, on
// vérifie l'effectif et la cohérence du calendrier.
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

const { data: calendrier, error: errC } = await supabase.from('calendrier_officiel').select('id, equipe_domicile, equipe_exterieur, date_match').eq('division', NIVEAU).eq('groupe', GROUPE).eq('saison', SAISON);
if (errC) { console.error('Erreur calendrier :', errC.message); process.exit(1); }

for (const mot of ['blois', 'romorantin']) {
  const { data, error } = await supabase.from('joueurs').select('id, prenom, nom, club, niveau, saison, matchs_joues').ilike('club', `%${mot}%`);
  if (error) { console.log(mot, 'erreur', error.message); continue; }
  console.log(`\n=== "${mot}" : ${data.length} joueur(s) trouvé(s) (tous clubs/saisons confondus) ===`);
  const parClubSaison = {};
  for (const d of data) {
    const cle = `${d.club} | ${d.niveau} | ${d.saison}`;
    (parClubSaison[cle] ||= []).push(d);
  }
  for (const [cle, joueurs] of Object.entries(parClubSaison)) {
    console.log(`  Groupe "${cle}" : ${joueurs.length} joueur(s)`);
  }

  const saison2627 = data.filter((d) => d.saison === SAISON && d.niveau === NIVEAU);
  if (!saison2627.length) { console.log(`  Aucun joueur ${NIVEAU} saison ${SAISON} pour "${mot}".`); continue; }
  const clubExact = saison2627[0].club;
  const matchsClub = calendrier.filter((row) => clubWordsMatch(row.equipe_domicile, clubExact) || clubWordsMatch(row.equipe_exterieur, clubExact));
  console.log(`  Club exact utilisé : "${clubExact}" — ${matchsClub.length} ligne(s) calendrier groupe ${GROUPE} correspondante(s).`);

  for (const j of saison2627) {
    const { data: mj, error: errMj } = await supabase.from('matchs_joueur').select('id, calendrier_officiel_id').eq('joueur_id', j.id);
    if (errMj) { console.log(`    ${j.prenom} ${j.nom} : erreur ${errMj.message}`); continue; }
    const idsReels = new Set(matchsClub.map((m) => m.id));
    const horsCalendrier = mj.filter((m) => m.calendrier_officiel_id && !idsReels.has(m.calendrier_officiel_id));
    const idsVus = new Set();
    const doublons = mj.filter((m) => { if (!m.calendrier_officiel_id) return false; if (idsVus.has(m.calendrier_officiel_id)) return true; idsVus.add(m.calendrier_officiel_id); return false; });
    const statut = mj.length === matchsClub.length && !horsCalendrier.length && !doublons.length ? 'OK' : 'PROBLÈME';
    console.log(`    ${j.prenom} ${j.nom} : ${mj.length} matchs_joueur (attendu ${matchsClub.length}), ${horsCalendrier.length} hors-calendrier, ${doublons.length} doublon(s) — ${statut}`);
  }
}
