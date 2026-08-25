// Diagnostic lecture seule : la synchro L'Équipe (groupe N1 A/B/C) filtre
// calendrier_officiel par division+groupe+saison, puis extrait les
// numéros de "journee" déjà joués. Vérifie les valeurs exactes de
// "groupe" et "journee" pour les lignes FC LORIENT 2, pour comprendre
// pourquoi la synchro (207 examinés en groupe A, 0 en B et C) n'a pas
// mis à jour ces joueurs.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const { data, error } = await supabase
  .from('calendrier_officiel')
  .select('id, equipe_domicile, equipe_exterieur, division, groupe, journee, saison, date_match')
  .eq('saison', '2026-2027')
  .or('equipe_domicile.ilike.%lorient%,equipe_exterieur.ilike.%lorient%,equipe_domicile.ilike.%briochin%,equipe_exterieur.ilike.%briochin%')
  .order('date_match', { ascending: true });
if (error) { console.error('Erreur :', error.message); process.exit(1); }
for (const r of data) console.log(`  id=${r.id} | division=${r.division} groupe=${JSON.stringify(r.groupe)} journee=${JSON.stringify(r.journee)} | ${r.date_match} | ${r.equipe_domicile} vs ${r.equipe_exterieur}`);
