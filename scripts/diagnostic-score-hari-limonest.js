// Diagnostic lecture seule : vérifie si le match du 21/08 d'Esteban Hari
// (Hyères vs Limonest) a déjà un score synchronisé.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const { data, error } = await supabase
  .from('matchs_joueur')
  .select('id, date_match, adversaire, score_pour, score_contre, verifie, domicile')
  .eq('joueur_id', '8cc1b685-2303-4c77-9b4b-9381d5f7bba1')
  .order('date_match', { ascending: true })
  .limit(5);
if (error) { console.error('Erreur :', error.message); process.exit(1); }
for (const m of data) console.log(`  ${m.date_match} vs ${m.adversaire} (${m.domicile ? 'dom.' : 'ext.'}) | score_pour=${m.score_pour} score_contre=${m.score_contre} verifie=${m.verifie}`);
