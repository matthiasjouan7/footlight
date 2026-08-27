// Corrige deux problèmes détectés par diagnostic-blois-romorantin.js :
//
// 1. Blois ("Blois Football 41", N2 groupe H) : Nicolas Pistol et Geoffrey
//    Marie-Louise ont chacun 1 matchs_joueur "hors calendrier" (25 au lieu
//    de 24 attendus) — on les supprime.
//
// 2. Romorantin : les 21 joueurs sont enregistrés sous le nom club
//    "Sologne Football Romorantin 41", qui ne correspond à AUCUNE ligne
//    calendrier_officiel (nom réel confirmé par diagnostic-clubs-groupe-h.js :
//    "So Romorantin 1"). On corrige le champ club de tous les joueurs, on
//    supprime leurs 504 matchs_joueur invalides (0 ligne réelle
//    correspondante à l'ancien nom), puis on génère le vrai calendrier.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const NIVEAU = 'N2';
const SAISON = '2026-2027';
const GROUPE = 'H';
const CLUB_ROMORANTIN_ANCIEN = 'Sologne Football Romorantin 41';
const CLUB_ROMORANTIN_REEL = 'So Romorantin 1';

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

console.log('\n=== 1. Nettoyage Blois (Pistol, Marie-Louise) ===');
const { data: blois, error: errB } = await supabase.from('joueurs').select('id, prenom, nom').eq('club', 'Blois Football 41').eq('niveau', NIVEAU).eq('saison', SAISON).in('nom', ['Pistol', 'Marie-Louise']);
if (errB) { console.error('Erreur recherche Blois :', errB.message); process.exit(1); }
console.log(`  ${blois.length} joueur(s) trouvé(s) (attendu 2).`);

const matchsClubBlois = calendrier.filter((row) => clubWordsMatch(row.equipe_domicile, 'Blois Football 41') || clubWordsMatch(row.equipe_exterieur, 'Blois Football 41'));
const idsReelsBlois = new Set(matchsClubBlois.map((m) => m.id));

for (const j of blois) {
  const { data: mj, error: errMj } = await supabase.from('matchs_joueur').select('id, calendrier_officiel_id, adversaire').eq('joueur_id', j.id);
  if (errMj) { console.log(`  ${j.prenom} ${j.nom} : erreur ${errMj.message}`); continue; }
  const horsCalendrier = mj.filter((m) => m.calendrier_officiel_id && !idsReelsBlois.has(m.calendrier_officiel_id));
  console.log(`  ${j.prenom} ${j.nom} : ${mj.length} matchs_joueur, ${horsCalendrier.length} hors-calendrier à supprimer.`);
  for (const m of horsCalendrier) console.log(`    -> id=${m.id} (adversaire="${m.adversaire}", calendrier_officiel_id=${m.calendrier_officiel_id})`);
  if (!dryRun && horsCalendrier.length) {
    const { error: delErr } = await supabase.from('matchs_joueur').delete().in('id', horsCalendrier.map((m) => m.id));
    if (delErr) console.log(`    Erreur suppression : ${delErr.message}`);
    else console.log(`    ${horsCalendrier.length} ligne(s) supprimée(s).`);
  }
}

console.log('\n=== 2. Correction Romorantin (club + calendrier) ===');
const { data: romorantin, error: errR } = await supabase.from('joueurs').select('id, prenom, nom').eq('club', CLUB_ROMORANTIN_ANCIEN).eq('niveau', NIVEAU).eq('saison', SAISON);
if (errR) { console.error('Erreur recherche Romorantin :', errR.message); process.exit(1); }
console.log(`  ${romorantin.length} joueur(s) trouvé(s) sous "${CLUB_ROMORANTIN_ANCIEN}".`);

const matchsClubRomorantin = calendrier.filter((row) => clubWordsMatch(row.equipe_domicile, CLUB_ROMORANTIN_REEL) || clubWordsMatch(row.equipe_exterieur, CLUB_ROMORANTIN_REEL));
console.log(`  ${matchsClubRomorantin.length} ligne(s) calendrier trouvée(s) pour "${CLUB_ROMORANTIN_REEL}".`);

for (const j of romorantin) {
  console.log(`  ${j.prenom} ${j.nom} :`);
  if (!dryRun) {
    const { error: updErr } = await supabase.from('joueurs').update({ club: CLUB_ROMORANTIN_REEL }).eq('id', j.id);
    if (updErr) { console.log(`    Erreur mise à jour club : ${updErr.message}`); continue; }
  }
  const { data: mj, error: errMj } = await supabase.from('matchs_joueur').select('id').eq('joueur_id', j.id);
  if (errMj) { console.log(`    Erreur lecture matchs_joueur : ${errMj.message}`); continue; }
  console.log(`    ${mj.length} matchs_joueur existant(s) à supprimer (invalides, ancien nom de club).`);
  if (!dryRun && mj.length) {
    const { error: delErr } = await supabase.from('matchs_joueur').delete().in('id', mj.map((m) => m.id));
    if (delErr) { console.log(`    Erreur suppression : ${delErr.message}`); continue; }
  }
  if (!dryRun) {
    const aInserer = matchsClubRomorantin.map((row) => {
      const domicile = clubWordsMatch(row.equipe_domicile, CLUB_ROMORANTIN_REEL);
      return {
        joueur_id: j.id, saison: SAISON, date_match: row.date_match,
        adversaire: domicile ? row.equipe_exterieur : row.equipe_domicile,
        competition: 'championnat', domicile, verifie: true, calendrier_officiel_id: row.id,
      };
    });
    const { error: insErr } = await supabase.from('matchs_joueur').insert(aInserer);
    if (insErr) console.log(`    Erreur insertion calendrier réel : ${insErr.message}`);
    else console.log(`    ${aInserer.length} match(s) réel(s) inséré(s).`);
  }
}

if (dryRun) console.log('\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
