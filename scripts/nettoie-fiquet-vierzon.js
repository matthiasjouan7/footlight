// Corrige Arthur Fiquet (Vierzon Fc 1, N2 groupe H) : 25 matchs_joueur au
// lieu des 24 attendus, détecté par verifie-calendriers-groupe-h.js (1
// match hors-calendrier).
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const CLUB = 'Vierzon Fc 1';
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

const { data: calendrier, error: errC } = await supabase.from('calendrier_officiel').select('id, equipe_domicile, equipe_exterieur').eq('division', NIVEAU).eq('groupe', GROUPE).eq('saison', SAISON);
if (errC) { console.error('Erreur calendrier :', errC.message); process.exit(1); }
const matchsClub = calendrier.filter((row) => clubWordsMatch(row.equipe_domicile, CLUB) || clubWordsMatch(row.equipe_exterieur, CLUB));
const idsReels = new Set(matchsClub.map((m) => m.id));

const { data: candidats, error: errJ } = await supabase.from('joueurs').select('id, prenom, nom, club').eq('niveau', NIVEAU).eq('saison', SAISON).eq('nom', 'Fiquet');
if (errJ) { console.error('Erreur recherche joueur :', errJ.message); process.exit(1); }
const joueur = candidats.filter((j) => clubWordsMatch(j.club, CLUB));
console.log(`${joueur.length} joueur(s) trouvé(s) pour "Fiquet" au club "${CLUB}" (attendu 1, sur ${candidats.length} candidat(s) nom="Fiquet" toutes équipes confondues).`);

for (const j of joueur) {
  const { data: mj, error: errMj } = await supabase.from('matchs_joueur').select('id, calendrier_officiel_id, adversaire').eq('joueur_id', j.id);
  if (errMj) { console.log(`  ${j.prenom} ${j.nom} : erreur ${errMj.message}`); continue; }
  const horsCalendrier = mj.filter((m) => m.calendrier_officiel_id && !idsReels.has(m.calendrier_officiel_id));
  console.log(`  ${j.prenom} ${j.nom} : ${mj.length} matchs_joueur, ${horsCalendrier.length} hors-calendrier à supprimer.`);
  for (const m of horsCalendrier) console.log(`    -> id=${m.id} (adversaire="${m.adversaire}", calendrier_officiel_id=${m.calendrier_officiel_id})`);
  if (!dryRun && horsCalendrier.length) {
    const { error: delErr } = await supabase.from('matchs_joueur').delete().in('id', horsCalendrier.map((m) => m.id));
    if (delErr) console.log(`    Erreur suppression : ${delErr.message}`);
    else console.log(`    ${horsCalendrier.length} ligne(s) supprimée(s).`);
  }
}

if (dryRun) console.log('\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
