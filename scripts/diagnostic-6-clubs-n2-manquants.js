// Diagnostic (lecture seule) des 6 clubs signalés "manquants" par
// verifie-effectifs-n2-complet.js mais que l'utilisateur confirme être déjà
// en base sous d'autres noms :
//   "Onet Le Chat. 1"       -> Onet-le-Château
//   "Us Alenconnaise 61 1"  -> US Alençon 61
//   "Astdv 1"               -> AS Trouville Deauville
//   "Les Sables Vf 1"       -> Les Sables Vendée (Football)
//   "Vertou Ussa 1"         -> US Sainte-Anne Vertou
//   "Bourgoin J. Fc 1"      -> FC Bourgoin-Jallieu
//
// Recherche par mot-clé (large, insensible à la casse) pour retrouver le
// nom exact utilisé côté joueurs.club, puis vérifie si clubWordsMatch (la
// logique utilisée partout ailleurs dans le site) les rapproche ou non du
// nom officiel calendrier_officiel.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const NIVEAU = 'N2';
const SAISON = '2026-2027';

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

const CIBLES = [
  { officiel: 'Onet Le Chat. 1', groupe: 'A', motsCles: ['onet'] },
  { officiel: 'Us Alenconnaise 61 1', groupe: 'B', motsCles: ['alenc'] },
  { officiel: 'Astdv 1', groupe: 'D', motsCles: ['trouville', 'deauville'] },
  { officiel: 'Les Sables Vf 1', groupe: 'B', motsCles: ['sables'] },
  { officiel: 'Vertou Ussa 1', groupe: 'B', motsCles: ['vertou'] },
  { officiel: 'Bourgoin J. Fc 1', groupe: 'F', motsCles: ['bourgoin'] },
];

for (const cible of CIBLES) {
  console.log(`\n=== ${cible.officiel} (groupe ${cible.groupe}) ===`);
  const orFilter = cible.motsCles.map((m) => `club.ilike.%${m}%`).join(',');
  const { data, error } = await supabase.from('joueurs').select('id, prenom, nom, club, niveau, saison').or(orFilter);
  if (error) { console.log(`  Erreur : ${error.message}`); continue; }
  if (!data.length) { console.log('  Aucun joueur trouvé avec ces mots-clés, toutes divisions/saisons confondues.'); continue; }
  const parClubSaisonNiveau = {};
  for (const d of data) {
    const cle = `${d.club} | ${d.niveau} | ${d.saison}`;
    (parClubSaisonNiveau[cle] ||= []).push(d);
  }
  for (const [cle, joueurs] of Object.entries(parClubSaisonNiveau)) {
    console.log(`  "${cle}" : ${joueurs.length} joueur(s)`);
  }
  const n2Actuel = data.filter((d) => d.niveau === NIVEAU && d.saison === SAISON);
  if (n2Actuel.length) {
    const clubReel = n2Actuel[0].club;
    const match = clubWordsMatch(clubReel, cible.officiel);
    console.log(`  Club N2 ${SAISON} actuel : "${clubReel}" (${n2Actuel.length} joueur(s)) — clubWordsMatch avec "${cible.officiel}" : ${match ? 'OUI (déjà rapproché normalement)' : 'NON (rapprochement cassé, à corriger)'}`);
  } else {
    console.log(`  Aucun joueur en N2 ${SAISON} pour ce mot-clé (le club existe peut-être sous un autre niveau/saison, ou nulle part).`);
  }
}
