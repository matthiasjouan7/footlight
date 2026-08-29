// Corrige les score_pour/score_contre écrits à tort par le bug de lien
// match-direct partagé (voir lib-sync-lequipe-match-stats.js, correctif du
// même commit) : avant ce correctif, un rattrapage stats sur National 1
// groupe C journée 2 a appliqué le score de "Châteauroux 0-1 Hyères" (le
// seul match ayant un vrai lien sur cette page) à TOUS les autres matchs
// de la journée, dont "Limonest vs UF Touraine" (pas encore joué).
//
// Signature d'une ligne corrompue par ce bug précis : score_pour/
// score_contre renseignés MAIS minutes_jouees toujours null (le repli DOM
// n'écrit jamais minutes_jouees) — cohérent avec le fait qu'aucune autre
// écriture légitime n'a pu avoir lieu depuis pour ces matchs (le
// correctif les ignore désormais tant qu'aucune vraie source de stats
// n'est trouvée). Remet ces deux champs à null pour tous les matchs de
// cette journée SAUF le match réellement lié (Châteauroux vs Hyères).
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const DIVISION = 'N1';
const GROUPE = 'C';
const SAISON = '2026-2027';
// Journée 2 : matchs des 28-29 août 2026 (voir diagnostic précédent).
const DATE_MIN = '2026-08-28';
const DATE_MAX = '2026-08-29';
const MATCH_GENUINE_DOMICILE = 'Châteauroux';
const MATCH_GENUINE_EXTERIEUR = 'Hyères';

async function main() {
  const { data: cal, error: errC } = await supabase
    .from('calendrier_officiel')
    .select('id, equipe_domicile, equipe_exterieur, date_match')
    .eq('division', DIVISION).eq('groupe', GROUPE).eq('saison', SAISON)
    .gte('date_match', DATE_MIN).lte('date_match', DATE_MAX);
  if (errC) { console.error('Erreur calendrier :', errC.message); process.exitCode = 1; return; }

  const idsASuspecter = cal
    .filter((r) => !(r.equipe_domicile === MATCH_GENUINE_DOMICILE && r.equipe_exterieur === MATCH_GENUINE_EXTERIEUR))
    .map((r) => r.id);
  console.log(`${cal.length} ligne(s) calendrier_officiel pour cette journée, ${idsASuspecter.length} suspecte(s) (hors match réellement lié).`);

  const { data: mj, error: errMj } = await supabase
    .from('matchs_joueur')
    .select('id, joueur_id, calendrier_officiel_id, score_pour, score_contre, minutes_jouees')
    .in('calendrier_officiel_id', idsASuspecter);
  if (errMj) { console.error('Erreur matchs_joueur :', errMj.message); process.exitCode = 1; return; }

  const corrompues = mj.filter((m) => (m.score_pour != null || m.score_contre != null) && m.minutes_jouees == null);
  console.log(`\n${mj.length} ligne(s) matchs_joueur au total pour ces matchs suspects, ${corrompues.length} corrompue(s) (score renseigné, minutes_jouees null).`);

  for (const m of corrompues) {
    const ligneCal = cal.find((r) => r.id === m.calendrier_officiel_id);
    console.log(`  ${dryRun ? 'À corriger' : 'Correction'} : matchs_joueur id=${m.id} ("${ligneCal?.equipe_domicile}" vs "${ligneCal?.equipe_exterieur}") score_pour=${m.score_pour}/score_contre=${m.score_contre} -> null/null`);
    if (!dryRun) {
      const { error } = await supabase.from('matchs_joueur').update({ score_pour: null, score_contre: null }).eq('id', m.id);
      if (error) console.log(`    Erreur : ${error.message}`);
    }
  }

  console.log(`\nRésumé : ${corrompues.length} ligne(s) ${dryRun ? 'à corriger' : 'corrigée(s)'}.`);
  if (dryRun) console.log('DRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
}

main().finally(() => process.exit(process.exitCode || 0));
