// Corrige le calendrier de US Alençon 61 (N2 groupe B, saison 2026-2027,
// 21 joueurs déjà en base sous le nom exact "US Alençon 61").
//
// "Alençon" (ville, nom d'usage joueur) et "Alenconnaise" (nom officiel
// calendrier_officiel "Us Alenconnaise 61 1") ne partagent aucun mot après
// normalisation — même pattern que VFC/Vendée ou SBFC/Beaucairois. Le
// remplacement alenconnaise -> alencon vient d'être ajouté dans les 5
// fichiers canoniques (generer-calendriers-existants.js,
// lib-sync-lequipe-match-stats.js, footlight-recherche.html,
// footlight-inscription-joueur.html, footlight-modifier-profil.html).
//
// Ce script nettoie les matchs_joueur invalides puis génère le vrai
// calendrier pour les joueurs concernés, avec la logique corrigée.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const CLUB_JOUEUR = 'US Alençon 61';
const CLUB_OFFICIEL = 'Us Alenconnaise 61 1';
const NIVEAU = 'N2';
const SAISON = '2026-2027';
const GROUPE = 'B';

function normalizeName(s) { return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' '); }
function normalizeClub(s) { return normalizeName(s).replace(/[.'/-]/g, ' ').replace(/\s+/g, ' ').trim().replace(/\s\d{1,2}$/, ''); }
const CLUB_MOTS_GENERIQUES = new Set(['fc','ofc','afc','asc','ac','sc','csc','cs','us','uso','as','sa','sas','sr','srfa','ol','om','rc','fco','osc','sco','ent','entente','athletic','olympique','football','club','sporting','racing','stade','sur','sous','en','la','le','les','de','du','des']);
const CLUB_MOTS_REMPLACEMENT = { st: 'saint', ste: 'sainte', gd: 'grand', philibert: 'philbert', virois: 'vire', bayonnais: 'bayonne', briochin: 'brieuc', vfc: 'vendee', sbfc: 'beaucairois', alenconnaise: 'alencon' };
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

console.log(`Vérification clubWordsMatch("${CLUB_JOUEUR}", "${CLUB_OFFICIEL}") = ${clubWordsMatch(CLUB_JOUEUR, CLUB_OFFICIEL)}`);

const { data: joueurs, error: errJ } = await supabase.from('joueurs').select('id, prenom, nom').eq('club', CLUB_JOUEUR).eq('niveau', NIVEAU).eq('saison', SAISON);
if (errJ) { console.error('Erreur recherche joueurs :', errJ.message); process.exit(1); }
console.log(`${joueurs.length} joueur(s) trouvé(s) sous "${CLUB_JOUEUR}".`);

const { data: calendrier, error: errC } = await supabase.from('calendrier_officiel').select('id, equipe_domicile, equipe_exterieur, date_match').eq('division', NIVEAU).eq('groupe', GROUPE).eq('saison', SAISON);
if (errC) { console.error('Erreur calendrier :', errC.message); process.exit(1); }
const matchsClub = calendrier.filter((row) => clubWordsMatch(row.equipe_domicile, CLUB_OFFICIEL) || clubWordsMatch(row.equipe_exterieur, CLUB_OFFICIEL));
console.log(`${matchsClub.length} ligne(s) calendrier trouvée(s) pour "${CLUB_OFFICIEL}" (groupe ${GROUPE}).`);

for (const j of joueurs) {
  console.log(`${j.prenom} ${j.nom} :`);
  const { data: mj, error: errMj } = await supabase.from('matchs_joueur').select('id, calendrier_officiel_id').eq('joueur_id', j.id);
  if (errMj) { console.log(`  Erreur lecture matchs_joueur : ${errMj.message}`); continue; }
  const idsReels = new Set(matchsClub.map((m) => m.id));
  const horsCalendrier = mj.filter((m) => m.calendrier_officiel_id && !idsReels.has(m.calendrier_officiel_id));
  const idsVus = new Set();
  const doublons = mj.filter((m) => { if (!m.calendrier_officiel_id) return false; if (idsVus.has(m.calendrier_officiel_id)) return true; idsVus.add(m.calendrier_officiel_id); return false; });
  const idsDejaValides = new Set(mj.filter((m) => m.calendrier_officiel_id && idsReels.has(m.calendrier_officiel_id)).map((m) => m.calendrier_officiel_id));
  const manquants = matchsClub.filter((row) => !idsDejaValides.has(row.id));
  console.log(`  ${mj.length} matchs_joueur existant(s), ${horsCalendrier.length} hors-calendrier, ${doublons.length} doublon(s), ${manquants.length} match(s) réel(s) manquant(s) à ajouter.`);
  if (!dryRun) {
    const aSupprimer = [...horsCalendrier, ...doublons];
    if (aSupprimer.length) {
      const { error: delErr } = await supabase.from('matchs_joueur').delete().in('id', aSupprimer.map((m) => m.id));
      if (delErr) console.log(`  Erreur suppression : ${delErr.message}`);
    }
    if (manquants.length) {
      const aInserer = manquants.map((row) => {
        const domicile = clubWordsMatch(row.equipe_domicile, CLUB_OFFICIEL);
        return {
          joueur_id: j.id, saison: SAISON, date_match: row.date_match,
          adversaire: domicile ? row.equipe_exterieur : row.equipe_domicile,
          competition: 'championnat', domicile, verifie: true, calendrier_officiel_id: row.id,
        };
      });
      const { error: insErr } = await supabase.from('matchs_joueur').insert(aInserer);
      if (insErr) console.log(`  Erreur insertion : ${insErr.message}`);
    }
  }
}

if (dryRun) console.log('\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
