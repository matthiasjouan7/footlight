// Corrige le champ club des 25 joueurs GFC Ajaccio : le nom saisi
// "Gfc Ajaccio" ne partageait aucun mot commun avec le nom officiel du
// calendrier "Gazelec Fc Ajaccio 1" ("gfc" ≠ "gazelec"), d'où 0 match
// trouvé. Met à jour le club vers le nom officiel puis génère le
// calendrier.
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
const NIVEAU = 'N2';
const GROUPE = 'H';
const ANCIEN_CLUB = 'Gfc Ajaccio';
const NOUVEAU_CLUB = 'Gazelec Fc Ajaccio 1';

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

const { data: joueurs, error: errJ } = await supabase.from('joueurs').select('id, prenom, nom').eq('saison', SAISON).eq('club', ANCIEN_CLUB);
if (errJ) { console.error('Erreur lecture joueurs :', errJ.message); process.exit(1); }
console.log(`${joueurs.length} joueur(s) trouvé(s) avec club="${ANCIEN_CLUB}".`);

if (!dryRun && joueurs.length) {
  const { error: updErr } = await supabase.from('joueurs').update({ club: NOUVEAU_CLUB }).eq('saison', SAISON).eq('club', ANCIEN_CLUB);
  if (updErr) { console.error('Erreur mise à jour club :', updErr.message); process.exit(1); }
  console.log(`  Club mis à jour vers "${NOUVEAU_CLUB}".`);
} else if (dryRun) {
  console.log(`  (DRY RUN) Club à mettre à jour vers "${NOUVEAU_CLUB}".`);
}

console.log(`\n=== Calendrier ${NOUVEAU_CLUB} ===`);
if (dryRun) {
  console.log('  (DRY RUN) Calendrier généré uniquement après écriture réelle.');
} else {
  const { data: calendrier, error: errC } = await supabase.from('calendrier_officiel').select('id, equipe_domicile, equipe_exterieur, date_match').eq('division', NIVEAU).eq('groupe', GROUPE).eq('saison', SAISON);
  if (errC) { console.error('Erreur calendrier :', errC.message); process.exit(1); }
  const matchsClub = calendrier.filter((row) => clubWordsMatch(row.equipe_domicile, NOUVEAU_CLUB) || clubWordsMatch(row.equipe_exterieur, NOUVEAU_CLUB));
  console.log(`  ${matchsClub.length} ligne(s) calendrier correspondante(s).`);
  let total = 0;
  for (const j of joueurs) {
    const aInserer = matchsClub.map((row) => {
      const domicile = clubWordsMatch(row.equipe_domicile, NOUVEAU_CLUB);
      return {
        joueur_id: j.id, saison: SAISON, date_match: row.date_match,
        adversaire: domicile ? row.equipe_exterieur : row.equipe_domicile,
        competition: 'championnat', domicile, verifie: true, calendrier_officiel_id: row.id,
      };
    });
    total += aInserer.length;
    const { error: insErr } = await supabase.from('matchs_joueur').insert(aInserer);
    if (insErr) console.log(`  Erreur insertion ${j.prenom} ${j.nom} : ${insErr.message}`);
  }
  console.log(`  Total : ${total} match(s) inséré(s).`);
}

if (dryRun) console.log('\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
