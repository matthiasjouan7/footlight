// Diagnostic lecture seule : le diagnostic précédent (villefranche only,
// recherche texte "villefranche") n'a trouvé que 35 lignes, mais Sabihi a
// 40 matchs_joueur au total, dont 30 pointent vers des calendrier_officiel_id
// (242, 249, 263...) absents de ces 35 lignes. Vérifie ce que ces lignes
// contiennent réellement — appartiennent-elles à un autre club (ex VFC La
// Roche-sur-Yon) par erreur, ou à Villefranche sous un nom ne contenant pas
// "villefranche" ?
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const IDS = [242,249,263,265,276,282,290,297,306,315,322,334,338,352,353,361,369,379,385,394,407,410,420,426,434,442,455,457,469,473];
const { data, error } = await supabase.from('calendrier_officiel').select('id, equipe_domicile, equipe_exterieur, date_match, division, groupe, saison').in('id', IDS).order('date_match');
if (error) { console.error('Erreur :', error.message); process.exit(1); }
for (const r of data) {
  console.log(`  id=${r.id} — ${r.date_match} — ${r.equipe_domicile} vs ${r.equipe_exterieur} — division=${r.division} groupe=${r.groupe} saison=${r.saison}`);
}
console.log(`\n${data.length}/${IDS.length} ligne(s) trouvée(s).`);
