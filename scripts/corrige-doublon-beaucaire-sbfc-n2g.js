// Le diagnostic proactif (diagnostic-doublons-club-toutes-divisions.js) a
// signalé des journées en trop en N2 groupe G impliquant "Sbfc 1" (nom
// officiel FFF de Stade Beaucairois 30) et "Beaucaire" (nom court
// lequipe.fr) : sync-lequipe-to-calendrier.js ne les reconnaissait pas
// comme le même club (voir correctif CLUB_SYNONYMES_COMPLETS
// beaucairois->beaucaire dans sync-lequipe-to-calendrier.js /
// rattrapage-lequipe-to-calendrier.js / lib-sync-lequipe-match-stats.js),
// créant une ligne calendrier "Beaucaire" en double de la ligne "Sbfc 1"
// existante à chaque journée. Ce script nettoie les doublons déjà créés :
// pour chaque journée où une ligne "Sbfc" ET une ligne "Beaucaire"
// coexistent avec le même adversaire (via clubsCorrespondent), rattache les
// matchs_joueur de la ligne "Beaucaire" (doublon) vers la ligne "Sbfc"
// (conservée, car c'est la série historique déjà utilisée pour générer les
// calendriers joueurs), puis supprime la ligne "Beaucaire" en trop.
//
// Sécurité : DRY_RUN=true par défaut. Ne touche que N2 groupe G.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const SAISON = '2026-2027';

function normalizeName(s) { return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' '); }
function normalizeClub(s) { return normalizeName(s).replace(/[.'/-]/g, ' ').replace(/\s+/g, ' ').trim().replace(/\s\d{1,2}$/, ''); }
const CLUB_MOTS_GENERIQUES = new Set(['fc', 'ofc', 'afc', 'asc', 'ac', 'sc', 'csc', 'cs', 'us', 'uso', 'as', 'sa', 'sas', 'sr', 'srfa', 'ol', 'om', 'rc', 'fco', 'osc', 'sco', 'ent', 'entente', 'athletic', 'olympique', 'football', 'club', 'sporting', 'racing', 'stade', 'sur', 'sous', 'en', 'la', 'le', 'les', 'de', 'du', 'des']);
const CLUB_MOTS_REMPLACEMENT = { st: 'saint', ste: 'sainte', gd: 'grand', vfc: 'vendee', sbfc: 'beaucairois' };
const CLUB_SYNONYMES_COMPLETS = { beaucairois: { mots: ['beaucaire'], elargi: false } };
function clubWords(s) {
  const mots = normalizeClub(s).split(' ').filter(Boolean).map((w) => CLUB_MOTS_REMPLACEMENT[w] || w);
  const sansGeneriques = mots.filter((w) => !CLUB_MOTS_GENERIQUES.has(w));
  return sansGeneriques.length ? sansGeneriques : mots;
}
function clubIdentitySignature(s) {
  const cle = clubWords(s).slice().sort().join(' ');
  const synonyme = CLUB_SYNONYMES_COMPLETS[cle];
  return synonyme ? synonyme.mots.slice().sort().join(' ') : cle;
}
function motsProches(a, b) {
  if (a === b) return true;
  const [court, long] = a.length <= b.length ? [a, b] : [b, a];
  return court.length >= 4 && long.startsWith(court);
}
function clubsCorrespondent(a, b) {
  if (clubIdentitySignature(a) === clubIdentitySignature(b)) return true;
  const wa = clubWords(a), wb = clubWords(b);
  if (!wa.length || !wb.length) return false;
  const [small, big] = wa.length <= wb.length ? [wa, wb] : [wb, wa];
  for (const w of small) if (!big.some((w2) => motsProches(w, w2))) return false;
  return true;
}

const { data: calendrier, error: errC } = await supabase
  .from('calendrier_officiel')
  .select('id, journee, date_match, equipe_domicile, equipe_exterieur')
  .eq('saison', SAISON).eq('division', 'N2').eq('groupe', 'G');
if (errC) { console.error('Erreur lecture calendrier :', errC.message); process.exit(1); }
console.log(`${calendrier.length} ligne(s) calendrier N2 groupe G.`);

const estSbfc = (nom) => /sbfc/i.test(nom || '');
const estBeaucaire = (nom) => /beaucaire/i.test(nom || '') && !estSbfc(nom);

const parJournee = new Map();
for (const r of calendrier) {
  if (!parJournee.has(r.journee)) parJournee.set(r.journee, []);
  parJournee.get(r.journee).push(r);
}

let totalRattaches = 0, totalSupprimesMj = 0, totalCalendrierSupprimes = 0;
for (const [journee, rows] of [...parJournee.entries()].sort((a, b) => a[0] - b[0])) {
  const ligneSbfc = rows.find((r) => estSbfc(r.equipe_domicile) || estSbfc(r.equipe_exterieur));
  const ligneBeaucaire = rows.find((r) => estBeaucaire(r.equipe_domicile) || estBeaucaire(r.equipe_exterieur));
  if (!ligneSbfc || !ligneBeaucaire) continue;

  const adversaireSbfc = estSbfc(ligneSbfc.equipe_domicile) ? ligneSbfc.equipe_exterieur : ligneSbfc.equipe_domicile;
  const adversaireBeaucaire = estBeaucaire(ligneBeaucaire.equipe_domicile) ? ligneBeaucaire.equipe_exterieur : ligneBeaucaire.equipe_domicile;
  if (!clubsCorrespondent(adversaireSbfc, adversaireBeaucaire)) {
    console.log(`Journée ${journee} : "Sbfc" (id=${ligneSbfc.id}, adversaire "${adversaireSbfc}") et "Beaucaire" (id=${ligneBeaucaire.id}, adversaire "${adversaireBeaucaire}") ont des adversaires différents — pas traité comme doublon (2 vrais matchs distincts ?).`);
    continue;
  }

  console.log(`\nJournée ${journee} : doublon confirmé — id=${ligneSbfc.id} "${ligneSbfc.equipe_domicile}" vs "${ligneSbfc.equipe_exterieur}" (${ligneSbfc.date_match}) [conservé] / id=${ligneBeaucaire.id} "${ligneBeaucaire.equipe_domicile}" vs "${ligneBeaucaire.equipe_exterieur}" (${ligneBeaucaire.date_match}) [doublon]`);

  const { data: mjDoublon, error: errMj } = await supabase.from('matchs_joueur').select('id, joueur_id, calendrier_officiel_id').eq('calendrier_officiel_id', ligneBeaucaire.id);
  if (errMj) { console.log(`  Erreur lecture matchs_joueur doublon : ${errMj.message}`); continue; }
  const { data: mjCanon, error: errMj2 } = await supabase.from('matchs_joueur').select('id, joueur_id').eq('calendrier_officiel_id', ligneSbfc.id);
  if (errMj2) { console.log(`  Erreur lecture matchs_joueur canonique : ${errMj2.message}`); continue; }
  const joueursDejaPresents = new Set((mjCanon || []).map((m) => m.joueur_id));

  console.log(`  ${mjDoublon.length} ligne(s) matchs_joueur sur la ligne doublon (id=${ligneBeaucaire.id}).`);
  for (const m of mjDoublon) {
    if (joueursDejaPresents.has(m.joueur_id)) {
      console.log(`    Joueur ${m.joueur_id} : déjà présent sur la ligne canonique — ${dryRun ? 'à supprimer' : 'suppression'} matchs_joueur id=${m.id}.`);
      totalSupprimesMj++;
      if (!dryRun) {
        const { error } = await supabase.from('matchs_joueur').delete().eq('id', m.id);
        if (error) console.log(`      Erreur : ${error.message}`);
      }
    } else {
      console.log(`    Joueur ${m.joueur_id} : ${dryRun ? 'à rattacher' : 'rattachement'} matchs_joueur id=${m.id} → calendrier_officiel_id=${ligneSbfc.id}.`);
      joueursDejaPresents.add(m.joueur_id);
      totalRattaches++;
      if (!dryRun) {
        const { error } = await supabase.from('matchs_joueur').update({ calendrier_officiel_id: ligneSbfc.id }).eq('id', m.id);
        if (error) console.log(`      Erreur : ${error.message}`);
      }
    }
  }

  console.log(`  Ligne calendrier doublon id=${ligneBeaucaire.id} : ${dryRun ? 'à supprimer' : 'suppression'}.`);
  totalCalendrierSupprimes++;
  if (!dryRun) {
    const { error } = await supabase.from('calendrier_officiel').delete().eq('id', ligneBeaucaire.id);
    if (error) console.log(`    Erreur suppression calendrier : ${error.message}`);
  }
}

console.log(`\n=== TOTAL ===`);
console.log(`${totalRattaches} rattachement(s) matchs_joueur, ${totalSupprimesMj} suppression(s) matchs_joueur (déjà présents), ${totalCalendrierSupprimes} ligne(s) calendrier "Beaucaire" ${dryRun ? 'à supprimer' : 'supprimée(s)'}.`);
if (dryRun) console.log('\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
