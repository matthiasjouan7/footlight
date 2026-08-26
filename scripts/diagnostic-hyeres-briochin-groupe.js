// Suite du diagnostic précédent : Aristide Mateta/Alexis Taïpa/Lucas Daury
// (Stade Briochin, cal_id=243) et Esteban Hari (Hyères, cal_id=2800) ont
// bien une ligne matchs_joueur/calendrier_officiel, mais score et
// minutes_jouees restent null 4-5 jours après le match — la synchro des
// scores ne les a jamais touchés. Regarde les lignes calendrier_officiel
// exactes (division/groupe/journée/date/noms) et si D'AUTRES matchs du
// même groupe+journée+date ont, eux, un score déjà connu (pour savoir si
// la synchro a tourné sur ce groupe/date et a juste raté ces deux matchs
// précis, ou si elle n'a jamais atteint cette date du tout).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

for (const calId of [2800, 243]) {
  console.log(`\n=== calendrier_officiel id=${calId} ===`);
  const { data: cal, error: errCal } = await supabase
    .from('calendrier_officiel')
    .select('*')
    .eq('id', calId)
    .single();
  if (errCal || !cal) { console.error('Erreur :', errCal?.message); continue; }
  console.log(JSON.stringify(cal));

  const { data: memeGroupe, error: errG } = await supabase
    .from('calendrier_officiel')
    .select('id, equipe_domicile, equipe_exterieur, date_match')
    .eq('saison', cal.saison)
    .eq('division', cal.division)
    .eq('groupe', cal.groupe)
    .eq('journee', cal.journee);
  if (errG) { console.error('Erreur groupe :', errG.message); continue; }
  console.log(`${memeGroupe.length} match(s) dans ${cal.division} groupe ${cal.groupe} journée ${cal.journee} (saison ${cal.saison}) :`);

  for (const m of memeGroupe) {
    const { data: mj } = await supabase
      .from('matchs_joueur')
      .select('score_pour, score_contre, minutes_jouees')
      .eq('calendrier_officiel_id', m.id)
      .not('score_pour', 'is', null)
      .limit(1);
    const aScore = mj && mj.length > 0;
    console.log(`  id=${m.id} | ${m.date_match} | ${m.equipe_domicile} vs ${m.equipe_exterieur} | score connu: ${aScore ? 'OUI' : 'non'}`);
  }
}
