// Diagnostic lecture seule : vérifie spécifiquement si les matchs de la
// NOUVELLE saison 2026-2027 déjà joués (21-22/08) ont déjà un score
// connu dans matchs_joueur (contrairement à l'échantillon précédent qui
// remontait uniquement des dates de la saison précédente, mai 2026).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const { data, error, count } = await supabase
  .from('matchs_joueur')
  .select('id, joueur_id, date_match, adversaire, score_pour, score_contre, verifie, saison', { count: 'exact' })
  .gte('date_match', '2026-08-20')
  .lte('date_match', '2026-08-25');
if (error) { console.error('Erreur :', error.message); process.exit(1); }
console.log(`${count} ligne(s) matchs_joueur pour la période 20-25/08/2026.`);
const avecScore = data.filter((m) => m.score_pour != null);
console.log(`Dont avec score_pour renseigné : ${avecScore.length}`);
console.log('\nÉchantillon (10 premières) :');
for (const m of data.slice(0, 10)) console.log(`  ${m.date_match} vs ${m.adversaire} | score_pour=${m.score_pour} score_contre=${m.score_contre} verifie=${m.verifie} saison=${m.saison}`);
