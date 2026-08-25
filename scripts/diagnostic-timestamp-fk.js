// Diagnostic lecture seule : vérifie si les matchs_joueur bloquant la
// suppression des lignes orphelines (3031-3037, 2747, 2753, 2754, 2790)
// ont été créés TRÈS récemment (pendant les tentatives de nettoyage),
// ce qui indiquerait une synchronisation externe (cron) qui recrée ces
// lignes/matchs en parallèle plutôt qu'un reste du nettoyage précédent.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const IDS = [2747, 2753, 2754, 2760, 2790, 3031, 3032, 3033, 3034, 3035, 3036, 3037];

const { data: matchs, error } = await supabase
  .from('matchs_joueur')
  .select('id, calendrier_officiel_id, created_at')
  .in('calendrier_officiel_id', IDS)
  .order('created_at', { ascending: false });
if (error) { console.error('Erreur :', error.message); process.exit(1); }
console.log(`${matchs.length} matchs_joueur trouvé(s) pour ces ids.\n`);
for (const m of matchs.slice(0, 20)) console.log(`  calendrier_officiel_id=${m.calendrier_officiel_id} | matchs_joueur id=${m.id} | créé ${m.created_at}`);

const { data: lignesCal, error: errCal } = await supabase
  .from('calendrier_officiel')
  .select('id, equipe_domicile, equipe_exterieur, created_at')
  .in('id', IDS);
if (errCal) { console.error('Erreur calendrier_officiel :', errCal.message); process.exit(1); }
console.log(`\nLigne(s) calendrier_officiel encore présentes : ${lignesCal.length}`);
for (const l of lignesCal) console.log(`  id=${l.id} | ${l.equipe_domicile} vs ${l.equipe_exterieur} | créé ${l.created_at}`);
