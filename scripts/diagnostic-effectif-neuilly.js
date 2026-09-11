// Diagnostic lecture seule : liste l'effectif N2 2026-2027 enregistré côté
// FootLight pour Neuilly, afin de vérifier si le blocage à 1 match vient
// d'un effectif incomplet (comme observé pour d'autres clubs) ou d'un
// problème de correspondance de nom différent.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const { data, error } = await supabase
  .from('joueurs')
  .select('id, prenom, nom, club, matchs_joues')
  .eq('niveau', 'N2').eq('saison', '2026-2027')
  .ilike('club', '%neuilly%');
if (error) { console.error('Erreur :', error.message); process.exit(1); }

console.log(`${(data || []).length} joueur(s) trouvé(s) côté FootLight pour un club "neuilly" :`);
for (const j of data || []) {
  console.log(`  ${j.prenom} ${j.nom} — club="${j.club}" — matchs_joues=${j.matchs_joues}`);
}
