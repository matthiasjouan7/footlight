// Fusionne les deux fiches d'Enzo Valentim, signalées en double par
// l'utilisateur : même joueur (defenseur_central, transféré à Union Foot de
// Touraine), mais présent sous deux id distincts —
//   - ac0a7966-349a-4100-bc38-163f26606c61 : fiche "historique" (import
//     initial), avec la stats_saisons 2025-2026 à VFC La Roche-sur-Yon
//     (12 matchs, 2 passes), club encore affiché "VFC La Roche-sur-Yon".
//   - b928f509-8c06-4198-a165-a72e169a844c : fiche ajoutée avec l'effectif
//     Union Foot de Touraine (date de naissance connue, 26 lignes
//     matchs_joueur = calendrier 2026-2027 généré).
//
// On garde la fiche historique (id le plus ancien, avec la vraie
// stats_saisons) comme fiche canonique : club + date de naissance mis à
// jour depuis la fiche Touraine, les 26 lignes matchs_joueur réattribuées,
// puis la fiche en double supprimée.
//
// Sécurité : DRY_RUN=true par défaut. Vérifie les compteurs attendus
// (1 stats_saisons / 0 matchs_joueur sur la fiche gardée, 0 stats_saisons /
// 26 matchs_joueur sur le doublon) avant toute écriture, par précaution
// si les données ont changé depuis le diagnostic.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const ID_GARDE = 'ac0a7966-349a-4100-bc38-163f26606c61';
const ID_DOUBLON = 'b928f509-8c06-4198-a165-a72e169a844c';
const NOUVEAU_CLUB = 'Union Foot de Touraine';
const NOUVELLE_DATE_NAISSANCE = '2000-09-11';

const [{ data: garde, error: e1 }, { data: doublon, error: e2 }] = await Promise.all([
  supabase.from('joueurs').select('id, prenom, nom, club, date_naissance').eq('id', ID_GARDE).single(),
  supabase.from('joueurs').select('id, prenom, nom, club, date_naissance').eq('id', ID_DOUBLON).single(),
]);
if (e1 || !garde) { console.error(`Erreur lecture fiche gardée : ${e1?.message || 'introuvable'}`); process.exit(1); }
if (e2 || !doublon) { console.error(`Erreur lecture fiche doublon : ${e2?.message || 'introuvable'}`); process.exit(1); }

const { count: statsGarde } = await supabase.from('stats_saisons').select('id', { count: 'exact', head: true }).eq('joueur_id', ID_GARDE);
const { count: matchsGarde } = await supabase.from('matchs_joueur').select('id', { count: 'exact', head: true }).eq('joueur_id', ID_GARDE);
const { count: statsDoublon } = await supabase.from('stats_saisons').select('id', { count: 'exact', head: true }).eq('joueur_id', ID_DOUBLON);
const { count: matchsDoublon } = await supabase.from('matchs_joueur').select('id', { count: 'exact', head: true }).eq('joueur_id', ID_DOUBLON);

console.log(`Fiche gardée   : ${garde.prenom} ${garde.nom} (${garde.club}) — ${statsGarde} stats_saisons, ${matchsGarde} matchs_joueur`);
console.log(`Fiche doublon  : ${doublon.prenom} ${doublon.nom} (${doublon.club}) — ${statsDoublon} stats_saisons, ${matchsDoublon} matchs_joueur`);

if (statsGarde !== 1 || matchsGarde !== 0 || statsDoublon !== 0 || matchsDoublon !== 26) {
  console.error('Les compteurs ne correspondent plus au diagnostic attendu (1/0 sur la fiche gardée, 0/26 sur le doublon). Arrêt par précaution.');
  process.exit(1);
}

console.log(`\n1. Réattribuer les ${matchsDoublon} lignes matchs_joueur du doublon vers la fiche gardée.`);
console.log(`2. Mettre à jour la fiche gardée : club "${garde.club}" -> "${NOUVEAU_CLUB}", date de naissance "${garde.date_naissance || '—'}" -> "${NOUVELLE_DATE_NAISSANCE}".`);
console.log(`3. Supprimer la fiche doublon (${ID_DOUBLON}).`);

if (!dryRun) {
  const { error: reparentErr } = await supabase.from('matchs_joueur').update({ joueur_id: ID_GARDE }).eq('joueur_id', ID_DOUBLON);
  if (reparentErr) { console.log(`  Erreur réattribution matchs_joueur : ${reparentErr.message}`); process.exit(1); }

  const { error: updErr } = await supabase.from('joueurs').update({ club: NOUVEAU_CLUB, date_naissance: NOUVELLE_DATE_NAISSANCE }).eq('id', ID_GARDE);
  if (updErr) { console.log(`  Erreur mise à jour fiche gardée : ${updErr.message}`); process.exit(1); }

  const { error: delErr } = await supabase.from('joueurs').delete().eq('id', ID_DOUBLON);
  if (delErr) console.log(`  Erreur suppression doublon : ${delErr.message}`);
}
console.log(dryRun ? '\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.' : '\nTerminé.');
