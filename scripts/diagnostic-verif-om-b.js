// Diagnostic lecture seule : vérifie que les 32 joueurs d'Olympique
// Marseille 2 sont bien présents et publics, sur demande de l'utilisateur.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const { data, error } = await supabase
  .from('joueurs')
  .select('prenom, nom, profil_public, matchs_joues')
  .eq('club', 'Olympique Marseille 2')
  .eq('saison', '2026-2027')
  .order('nom');
if (error) { console.error('Erreur :', error.message); process.exit(1); }
console.log(`${data.length} joueur(s) trouvé(s) pour Olympique Marseille 2 :`);
for (const j of data) console.log(`  ${j.prenom} ${j.nom} — public=${j.profil_public} matchs_joues=${j.matchs_joues}`);
