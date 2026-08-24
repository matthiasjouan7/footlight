// Diagnostic lecture seule : vérifie si des joueurs existent déjà en base
// pour Les Sables (Vendée Football) et Saint-Philbert, avant un éventuel
// ajout d'effectif.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

for (const motif of ['sables', 'philbert', 'philibert']) {
  const { data, error } = await supabase
    .from('joueurs')
    .select('id, prenom, nom, club, niveau, saison')
    .ilike('club', `%${motif}%`);
  if (error) { console.error(`Erreur lecture joueurs (${motif}) :`, error.message); continue; }
  console.log(`\n"${motif}" : ${data?.length || 0} joueur(s) trouvé(s).`);
  const clubs = new Set((data || []).map((j) => `${j.club} (${j.niveau}, ${j.saison})`));
  for (const c of clubs) console.log(`  - ${c}`);
}
