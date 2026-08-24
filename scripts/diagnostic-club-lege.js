// Diagnostic lecture seule : cherche le nom exact utilisé dans
// calendrier_officiel pour l'équipe US Lège Cap-Ferret (National 2 groupe
// A), avant d'ajouter son effectif, pour choisir un nom de club qui se
// rapprochera correctement via clubWordsMatch (generer-calendriers-existants.js).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const { data, error } = await supabase
  .from('calendrier_officiel')
  .select('equipe_domicile, equipe_exterieur')
  .eq('division', 'N2')
  .eq('saison', '2026-2027')
  .or('equipe_domicile.ilike.%lege%,equipe_exterieur.ilike.%lege%,equipe_domicile.ilike.%ferret%,equipe_exterieur.ilike.%ferret%');

if (error) { console.error('Erreur lecture calendrier_officiel :', error.message); process.exit(1); }

const noms = new Set();
for (const m of data || []) {
  if (/lege|ferret/i.test(m.equipe_domicile)) noms.add(m.equipe_domicile);
  if (/lege|ferret/i.test(m.equipe_exterieur)) noms.add(m.equipe_exterieur);
}
console.log(`${data?.length || 0} match(s) trouvé(s).`);
console.log('Nom(s) distinct(s) :', [...noms].join(' | ') || '(aucun)');
