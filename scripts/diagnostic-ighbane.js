// Diagnostic (lecture seule) : recherche des joueurs "Ighbane" en base pour
// vérifier le doublon signalé entre "Naïm Ighbane" (importé à Toulon) et un
// éventuel "Noam Ighbane" déjà existant.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

const { data: joueurs, error } = await supabase
  .from('joueurs')
  .select('id, prenom, nom, club, niveau, saison, poste, date_naissance')
  .ilike('nom', '%ighbane%');
if (error) { console.error('Erreur lecture joueurs :', error.message); process.exit(1); }

console.log(`${joueurs.length} joueur(s) trouvé(s) :`);
for (const j of joueurs) {
  console.log(`  id=${j.id} | ${j.prenom} ${j.nom} | club="${j.club}" | niveau="${j.niveau}" | saison="${j.saison}" | poste="${j.poste}" | né(e) le ${j.date_naissance}`);
}
