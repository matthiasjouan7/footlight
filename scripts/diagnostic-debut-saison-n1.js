// Diagnostic lecture seule : vérifie la vraie date de début de la saison
// N1 2026-2027 (l'hypothèse précédente "29/08" était fausse — au moins un
// match a eu lieu le 21/08 pour Hyères). Liste les matchs déjà passés
// (date < aujourd'hui) et vérifie si des scores sont déjà connus
// (score_pour non nul) dans matchs_joueur pour ces dates passées.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const AUJOURDHUI = '2026-08-25';

const { data: calendrier, error } = await supabase
  .from('calendrier_officiel')
  .select('id, equipe_domicile, equipe_exterieur, date_match')
  .eq('division', 'N1')
  .eq('saison', '2026-2027')
  .order('date_match', { ascending: true })
  .limit(20);
if (error) { console.error('Erreur calendrier :', error.message); process.exit(1); }
console.log('Premiers matchs N1 2026-2027 (triés par date) :');
for (const r of calendrier) console.log(`  id=${r.id} | ${r.date_match} | ${r.equipe_domicile} vs ${r.equipe_exterieur}`);

const { data: passes, error: errP, count } = await supabase
  .from('calendrier_officiel')
  .select('id', { count: 'exact', head: true })
  .eq('division', 'N1')
  .eq('saison', '2026-2027')
  .lt('date_match', AUJOURDHUI);
if (errP) { console.error('Erreur count passés :', errP.message); process.exit(1); }
console.log(`\nNombre de lignes calendrier_officiel N1 déjà passées (date < ${AUJOURDHUI}) : ${count}`);

const { data: mjPasses, error: errMJ } = await supabase
  .from('matchs_joueur')
  .select('id, date_match, score_pour, score_contre, adversaire, verifie')
  .lt('date_match', AUJOURDHUI)
  .not('calendrier_officiel_id', 'is', null)
  .order('date_match', { ascending: true })
  .limit(15);
if (errMJ) { console.error('Erreur matchs_joueur passés :', errMJ.message); process.exit(1); }
console.log(`\nÉchantillon de matchs_joueur pour des dates passées (score_pour renseigné ou non) :`);
for (const m of mjPasses || []) console.log(`  ${m.date_match} vs ${m.adversaire} | score_pour=${m.score_pour} score_contre=${m.score_contre} verifie=${m.verifie}`);

const { count: countAvecScore } = await supabase
  .from('matchs_joueur')
  .select('id', { count: 'exact', head: true })
  .lt('date_match', AUJOURDHUI)
  .not('score_pour', 'is', null);
console.log(`\nTotal matchs_joueur avec score_pour renseigné (toutes dates passées confondues) : ${countAvecScore}`);
