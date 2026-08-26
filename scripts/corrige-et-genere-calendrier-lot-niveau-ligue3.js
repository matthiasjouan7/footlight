// Correctif groupé : scan-niveau-errone-ligue3.js a trouvé 10 joueurs dont
// le club correspond à un club Ligue 3 connu (calendrier_officiel) mais
// dont le niveau déclaré est différent (tous "N1" en pratique) — même bug
// isolé, ligne par ligne, que Ahmed Majid/AS Cannes et Dembo
// Gassama/Villefranche Beaujolais (déjà corrigés individuellement). Pour
// les 10 restants, corrige le niveau vers "Ligue 3" PUIS génère leur
// calendrier en un seul passage, plutôt que deux scripts par joueur.
//
// Sécurité : DRY_RUN=true par défaut. Anti-doublon sur calendrier_officiel_id/
// date pour l'insertion des matchs, comme les scripts individuels.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

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

const { data: officiel, error: errO } = await supabase
  .from('calendrier_officiel')
  .select('id, equipe_domicile, equipe_exterieur, division, saison, date_match')
  .eq('saison', '2026-2027')
  .eq('division', 'Ligue 3');
if (errO) { console.error('Erreur calendrier :', errO.message); process.exit(1); }
const clubsLigue3 = [...new Set(officiel.flatMap((r) => [r.equipe_domicile, r.equipe_exterieur]))];

const { data: joueurs, error: errJ } = await supabase
  .from('joueurs')
  .select('id, prenom, nom, club, niveau, saison')
  .eq('saison', '2026-2027')
  .neq('niveau', 'Ligue 3');
if (errJ) { console.error('Erreur joueurs :', errJ.message); process.exit(1); }

const suspects = joueurs.filter((j) => clubsLigue3.some((c) => clubWordsMatch(c, j.club)));
console.log(`${suspects.length} joueur(s) suspect(s) (club Ligue 3 connu, niveau déclaré différent).\n`);

let totalCorriges = 0, totalMatchsInseres = 0;
for (const j of suspects) {
  console.log(`${j.prenom} ${j.nom} (${j.club}) : niveau "${j.niveau}" -> "Ligue 3"`);
  if (!dryRun) {
    const { error: errMaj } = await supabase.from('joueurs').update({ niveau: 'Ligue 3' }).eq('id', j.id);
    if (errMaj) { console.log(`  Erreur correction niveau : ${errMaj.message}`); continue; }
  }
  totalCorriges++;

  const matchsClub = officiel.filter((row) => clubWordsMatch(row.equipe_domicile, j.club) || clubWordsMatch(row.equipe_exterieur, j.club));
  const { data: existants, error: errE } = await supabase.from('matchs_joueur').select('calendrier_officiel_id, date_match').eq('joueur_id', j.id);
  if (errE) { console.log(`  Erreur lecture matchs existants : ${errE.message}`); continue; }
  const idsExistants = new Set((existants || []).filter((m) => m.calendrier_officiel_id).map((m) => String(m.calendrier_officiel_id)));
  const datesExistantes = new Set((existants || []).map((m) => m.date_match));

  const aInserer = matchsClub.filter((row) => !idsExistants.has(String(row.id)) && !datesExistantes.has(row.date_match)).map((row) => {
    const domicile = clubWordsMatch(row.equipe_domicile, j.club);
    return {
      joueur_id: j.id,
      saison: j.saison,
      date_match: row.date_match,
      adversaire: domicile ? row.equipe_exterieur : row.equipe_domicile,
      competition: 'championnat',
      domicile,
      verifie: true,
      calendrier_officiel_id: row.id,
    };
  });
  console.log(`  ${aInserer.length} match(s) à insérer.`);
  totalMatchsInseres += aInserer.length;
  if (!dryRun && aInserer.length) {
    const { error: insErr } = await supabase.from('matchs_joueur').insert(aInserer);
    if (insErr) console.log(`    Erreur insertion : ${insErr.message}`);
  }
}

console.log(`\nRésumé : ${totalCorriges} niveau(x) ${dryRun ? 'à corriger' : 'corrigé(s)'}, ${totalMatchsInseres} match(s) ${dryRun ? 'à insérer' : 'inséré(s)'}.`);
if (dryRun) console.log('DRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour appliquer.');
