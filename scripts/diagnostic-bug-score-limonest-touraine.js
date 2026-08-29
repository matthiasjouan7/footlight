// Diagnostic lecture seule : l'utilisateur signale un score affiché pour
// "Limonest vs UF Touraine" alors que le match n'a pas eu lieu. Vérifie la
// date_match réelle du calendrier_officiel et les score_pour/score_contre/
// minutes_jouees écrits par le rattrapage stats pour ce match.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: cal, error: errC } = await supabase
    .from('calendrier_officiel')
    .select('id, equipe_domicile, equipe_exterieur, date_match, division, groupe, saison')
    .eq('division', 'N1').eq('groupe', 'C')
    .or('equipe_domicile.ilike.%limonest%,equipe_exterieur.ilike.%limonest%');
  if (errC) { console.error('Erreur calendrier :', errC.message); process.exitCode = 1; return; }
  console.log(`${cal.length} ligne(s) calendrier_officiel impliquant Limonest :`);
  for (const r of cal) console.log(`  id=${r.id} | "${r.equipe_domicile}" vs "${r.equipe_exterieur}" | date_match=${r.date_match} | saison=${r.saison}`);

  const idsCal = cal.map((r) => r.id);
  const { data: mj, error: errMj } = await supabase
    .from('matchs_joueur')
    .select('id, joueur_id, calendrier_officiel_id, date_match, adversaire, score_pour, score_contre, minutes_jouees, domicile')
    .in('calendrier_officiel_id', idsCal);
  if (errMj) { console.error('Erreur matchs_joueur :', errMj.message); process.exitCode = 1; return; }

  console.log(`\n${mj.length} ligne(s) matchs_joueur pour ces matchs Limonest.`);
  const parCal = new Map();
  for (const m of mj) {
    if (!parCal.has(m.calendrier_officiel_id)) parCal.set(m.calendrier_officiel_id, []);
    parCal.get(m.calendrier_officiel_id).push(m);
  }
  for (const [calId, liste] of parCal) {
    const ligneCal = cal.find((r) => r.id === calId);
    console.log(`\n--- calendrier_officiel id=${calId} ("${ligneCal?.equipe_domicile}" vs "${ligneCal?.equipe_exterieur}", date_match=${ligneCal?.date_match}) ---`);
    const avecScore = liste.filter((m) => m.score_pour != null || m.score_contre != null);
    console.log(`  ${liste.length} joueur(s) liés, ${avecScore.length} avec un score renseigné.`);
    for (const m of liste.slice(0, 5)) {
      console.log(`    joueur_id=${m.joueur_id} date_match=${m.date_match} adversaire="${m.adversaire}" score_pour=${m.score_pour} score_contre=${m.score_contre} minutes_jouees=${m.minutes_jouees}`);
    }
  }

  console.log(`\nDate du jour (référence système) : voir contexte session, à comparer aux date_match ci-dessus.`);
}

main().finally(() => process.exit(process.exitCode || 0));
