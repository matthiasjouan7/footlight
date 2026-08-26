// Nettoyage : les diagnostics précédents ont montré que N1 groupes B et C,
// journée 1, contiennent chacun une série de lignes calendrier_officiel
// dupliquées (créées par le bug connu et non corrigé de
// sync-lequipe-to-calendrier.js — noms d'usage lequipe.fr sans mot commun
// avec le nom officiel, capture d'une seule date de journée), en plus des
// lignes officielles réelles auxquelles les joueurs FootLight sont
// rattachés. Depuis l'enrichissement du rapprochement de
// lib-sync-lequipe-match-stats.js, les DEUX lignes matchent désormais le
// même match scrapé, et calRowsJournee.find() peut retomber sur le
// doublon (aucun joueur lié) au lieu de la ligne officielle — le score ne
// s'écrit alors jamais.
//
// Regroupe les lignes du groupe+journée par équipes réelles (même logique
// de rapprochement enrichie, plutôt qu'une heuristique de date majoritaire
// qui s'est révélée fausse quand les doublons sont plus nombreux que les
// vrais matchs sur une date) : dans chaque groupe de lignes désignant le
// même match, supprime celles sans AUCUNE ligne matchs_joueur, seulement
// s'il existe au moins une autre ligne du même groupe qui, elle, a des
// joueurs liés (aucune perte de données possible, et on ne touche jamais
// un match unique/pas encore joué).
//
// DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);

// ── Même rapprochement enrichi que lib-sync-lequipe-match-stats.js ──
function normaliserClub(str) {
  return (str || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[.'/-]/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(/\s(\d{1,2}|[bc])$/, '');
}
const MOTS_GENERIQUES_CLUB = new Set(['fc', 'ofc', 'afc', 'asc', 'ac', 'sc', 'csc', 'cs', 'us', 'uso', 'as', 'sm', 'sa', 'ol', 'om', 'rc', 'fco', 'osc', 'sco', 'ent', 'entente', 'athletic', 'football', 'club', 'sporting', 'racing', 'stade', 'olympique', 'efc', 'srfa', 'sur', 'sous', 'en', 'la', 'le', 'les', 'de', 'du', 'des']);
const MOTS_REMPLACEMENT_CLUB = {
  st: 'saint', ste: 'sainte', gd: 'grand', philibert: 'philbert',
  virois: 'vire', bayonnais: 'bayonne', briochin: 'brieuc',
};
const CLUB_SYNONYMES_COMPLETS_STATS = {
  fcldsd: { mots: ['limonest'], elargi: false },
  goal: { mots: ['grand', 'ouest', 'associat'], elargi: false },
  'poire vendee': { mots: ['poire', 'vie'], elargi: false },
};
function motsClub(s) {
  const mots = normaliserClub(s).split(' ').filter(Boolean);
  const remplaces = mots.map((w) => MOTS_REMPLACEMENT_CLUB[w] || w);
  const sansGeneriques = remplaces.filter((w) => !MOTS_GENERIQUES_CLUB.has(w));
  return sansGeneriques.length ? sansGeneriques : remplaces;
}
function signatureClub(s) {
  const cle = motsClub(s).slice().sort().join(' ');
  const synonyme = CLUB_SYNONYMES_COMPLETS_STATS[cle];
  return synonyme ? synonyme.mots.slice().sort().join(' ') : cle;
}
function motsClubElargi(s) {
  const mots = motsClub(s);
  const cle = mots.slice().sort().join(' ');
  const synonyme = CLUB_SYNONYMES_COMPLETS_STATS[cle];
  return (synonyme && synonyme.elargi) ? [...mots, ...synonyme.mots] : mots;
}
function clubsCorrespondent(a, b) {
  const sigA = signatureClub(a), sigB = signatureClub(b);
  if (sigA && sigB && sigA === sigB) return true;
  const wa = motsClubElargi(a), wb = motsClubElargi(b);
  if (!wa.length || !wb.length) return false;
  const setA = new Set(wa), setB = new Set(wb);
  const [small, big] = wa.length <= wb.length ? [setA, setB] : [setB, setA];
  for (const w of small) if (!big.has(w)) return false;
  return true;
}
// ── Fin de la copie ──

const CIBLES = [
  { division: 'N1', groupe: 'B', journee: 1 },
  { division: 'N1', groupe: 'C', journee: 1 },
];

let supprimes = 0, conserves = 0;
for (const cible of CIBLES) {
  const { data: rows, error } = await supabase
    .from('calendrier_officiel')
    .select('id, equipe_domicile, equipe_exterieur, date_match')
    .eq('saison', '2026-2027')
    .eq('division', cible.division)
    .eq('groupe', cible.groupe)
    .eq('journee', cible.journee)
    .order('id', { ascending: true });
  if (error) { console.error('Erreur lecture :', error.message); continue; }
  console.log(`\n${cible.division} groupe ${cible.groupe} journée ${cible.journee} : ${rows.length} ligne(s)`);

  // Nombre de matchs_joueur liés à chaque ligne.
  const nbJoueurs = new Map();
  for (const r of rows) {
    const { data: mj, error: errMj } = await supabase
      .from('matchs_joueur')
      .select('id')
      .eq('calendrier_officiel_id', r.id)
      .limit(1);
    if (errMj) { console.error('Erreur matchs_joueur :', errMj.message); continue; }
    nbJoueurs.set(r.id, mj ? mj.length : 0);
  }

  // Regroupe les lignes désignant le même match réel (mêmes deux équipes).
  const traite = new Set();
  for (const r of rows) {
    if (traite.has(r.id)) continue;
    const cluster = rows.filter((c) =>
      !traite.has(c.id) &&
      clubsCorrespondent(c.equipe_domicile, r.equipe_domicile) &&
      clubsCorrespondent(c.equipe_exterieur, r.equipe_exterieur)
    );
    cluster.forEach((c) => traite.add(c.id));
    if (cluster.length < 2) continue; // pas de doublon pour ce match.

    const avecJoueurs = cluster.filter((c) => nbJoueurs.get(c.id) > 0);
    if (!avecJoueurs.length) {
      // Aucune ligne du cluster n'a de joueur lié : rien de sûr à
      // supprimer (pourrait être un match futur pas encore lié).
      cluster.forEach((c) => console.log(`  IGNORÉ (aucun joueur lié dans le cluster) id=${c.id} | ${c.date_match} | ${c.equipe_domicile} vs ${c.equipe_exterieur}`));
      continue;
    }
    for (const c of cluster) {
      if (nbJoueurs.get(c.id) > 0) {
        console.log(`  CONSERVÉ (a des joueurs liés) id=${c.id} | ${c.date_match} | ${c.equipe_domicile} vs ${c.equipe_exterieur}`);
        conserves++;
        continue;
      }
      console.log(`  ${dryRun ? 'À supprimer' : 'Supprimé'} id=${c.id} | ${c.date_match} | ${c.equipe_domicile} vs ${c.equipe_exterieur}`);
      if (!dryRun) {
        const { error: errDel } = await supabase.from('calendrier_officiel').delete().eq('id', c.id);
        if (errDel) { console.error(`    Erreur suppression : ${errDel.message}`); continue; }
      }
      supprimes++;
    }
  }
}
console.log(`\nRésumé : ${supprimes} ligne(s) ${dryRun ? 'à supprimer' : 'supprimée(s)'}, ${conserves} conservée(s) (joueurs liés).`);
