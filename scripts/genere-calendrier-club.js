// Généralisation de genere-calendrier-limonest.js : génère les lignes
// matchs_joueur manquantes pour tous les joueurs d'un club, à partir du
// calendrier officiel déjà rattrapé (calendrier_officiel). Le rattrapage
// calendrier (rattrapage-lequipe-to-calendrier.js) ne remplit que
// calendrier_officiel ; les lignes matchs_joueur par joueur ne se génèrent
// pas automatiquement quand un joueur a déjà au moins un match existant
// (la génération auto de footlight-inscription-joueur.html/footlight-
// modifier-profil.html ne se redéclenche pas toute seule). Ce script
// complète l'historique de chaque joueur du club directement.
//
// Détecte automatiquement le groupe (A/B/C pour N1, A-H pour N2) en
// cherchant dans quel groupe le club apparaît dans calendrier_officiel,
// si GROUPE n'est pas fourni explicitement.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const NIVEAU = process.env.NIVEAU || 'N1';
const SAISON = process.env.SAISON || '2026-2027';
const CLUB = process.env.CLUB;
let GROUPE = process.env.GROUPE || null;
if (!CLUB) { console.error('CLUB manquant (variable d\'environnement).'); process.exit(1); }

function normalizeName(s) { return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' '); }
function normalizeClub(s) { return normalizeName(s).replace(/[.'/-]/g, ' ').replace(/\s+/g, ' ').trim().replace(/\s\d{1,2}$/, ''); }
const CLUB_MOTS_GENERIQUES = new Set(['fc', 'ofc', 'afc', 'asc', 'ac', 'sc', 'csc', 'cs', 'us', 'uso', 'as', 'sa', 'sas', 'sr', 'srfa', 'ol', 'om', 'rc', 'fco', 'osc', 'sco', 'ent', 'entente', 'athletic', 'olympique', 'football', 'club', 'sporting', 'racing', 'stade', 'sur', 'sous', 'en', 'la', 'le', 'les', 'de', 'du', 'des']);
const CLUB_MOTS_REMPLACEMENT = { st: 'saint', ste: 'sainte', gd: 'grand', philibert: 'philbert', virois: 'vire', bayonnais: 'bayonne', briochin: 'brieuc', vfc: 'vendee', sbfc: 'beaucairois', alenconnaise: 'alencon' };
function clubWords(s) {
  const mots = normalizeClub(s).split(' ').filter(Boolean).map((w) => CLUB_MOTS_REMPLACEMENT[w] || w);
  let sansGeneriques = mots.filter((w) => !CLUB_MOTS_GENERIQUES.has(w));
  if (sansGeneriques.includes('hyeres')) sansGeneriques = sansGeneriques.filter((w) => w !== '83');
  return sansGeneriques.length ? sansGeneriques : mots;
}
function clubIdentitySignature(s) { return clubWords(s).slice().sort().join(' '); }
function clubWordsMatch(a, b) {
  if (clubIdentitySignature(a) === clubIdentitySignature(b)) return true;
  const wa = clubWords(a), wb = clubWords(b);
  if (!wa.length || !wb.length) return false;
  const setA = new Set(wa), setB = new Set(wb);
  const small = wa.length <= wb.length ? setA : setB;
  const big = wa.length <= wb.length ? setB : setA;
  for (const w of small) if (!big.has(w)) return false;
  return true;
}

if (!GROUPE) {
  const { data: tousGroupes, error } = await supabase.from('calendrier_officiel').select('groupe').eq('division', NIVEAU).eq('saison', SAISON);
  if (error) { console.error('Erreur détection groupe :', error.message); process.exit(1); }
  const groupesUniques = [...new Set(tousGroupes.map((r) => r.groupe))];
  for (const g of groupesUniques) {
    const { data: lignes } = await supabase.from('calendrier_officiel').select('equipe_domicile, equipe_exterieur').eq('division', NIVEAU).eq('groupe', g).eq('saison', SAISON);
    if ((lignes || []).some((r) => clubWordsMatch(r.equipe_domicile, CLUB) || clubWordsMatch(r.equipe_exterieur, CLUB))) { GROUPE = g; break; }
  }
  if (!GROUPE) { console.error(`Aucun groupe ${NIVEAU} ne contient "${CLUB}".`); process.exit(1); }
  console.log(`Groupe détecté automatiquement : ${GROUPE}`);
}

const { data: calendrier, error: errC } = await supabase.from('calendrier_officiel').select('id, equipe_domicile, equipe_exterieur, date_match').eq('division', NIVEAU).eq('groupe', GROUPE).eq('saison', SAISON);
if (errC) { console.error('Erreur calendrier :', errC.message); process.exit(1); }
const matchsClub = calendrier.filter((row) => clubWordsMatch(row.equipe_domicile, CLUB) || clubWordsMatch(row.equipe_exterieur, CLUB));
console.log(`${matchsClub.length} ligne(s) calendrier trouvée(s) pour "${CLUB}" (${NIVEAU} groupe ${GROUPE}).`);

const { data: joueurs, error: errJ } = await supabase.from('joueurs').select('id, prenom, nom').eq('club', CLUB).eq('niveau', NIVEAU).eq('saison', SAISON);
if (errJ) { console.error('Erreur joueurs :', errJ.message); process.exit(1); }
console.log(`${joueurs.length} joueur(s) "${CLUB}".\n`);

let totalAjoutes = 0;
for (const j of joueurs) {
  const { data: mj, error: errMj } = await supabase.from('matchs_joueur').select('id, calendrier_officiel_id').eq('joueur_id', j.id).eq('saison', SAISON);
  if (errMj) { console.log(`${j.prenom} ${j.nom} : erreur lecture matchs_joueur (${errMj.message})`); continue; }
  const idsExistants = new Set(mj.filter((m) => m.calendrier_officiel_id).map((m) => String(m.calendrier_officiel_id)));
  const manquants = matchsClub.filter((row) => !idsExistants.has(String(row.id)));
  console.log(`${j.prenom} ${j.nom} : ${mj.length} matchs_joueur existant(s), ${manquants.length} manquant(s) à ajouter.`);
  if (!manquants.length) continue;

  const aInserer = manquants.map((row) => {
    const domicile = clubWordsMatch(row.equipe_domicile, CLUB);
    return { joueur_id: j.id, saison: SAISON, date_match: row.date_match, adversaire: domicile ? row.equipe_exterieur : row.equipe_domicile, competition: 'championnat', domicile, verifie: true, calendrier_officiel_id: row.id };
  });
  totalAjoutes += aInserer.length;
  if (!dryRun) {
    const { error: insErr } = await supabase.from('matchs_joueur').insert(aInserer);
    if (insErr) console.log(`  Erreur insertion : ${insErr.message}`);
  }
}

console.log(`\nRésumé : ${totalAjoutes} match(s) ${dryRun ? 'à ajouter' : 'ajouté(s)'} au total sur ${joueurs.length} joueur(s).`);
if (dryRun) console.log('DRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
