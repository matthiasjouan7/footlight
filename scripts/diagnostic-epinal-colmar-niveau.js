// Diagnostic lecture seule : pourquoi Léo Hatier/Thomas Roche/Paul Léonard
// (SAS Épinal) et Alexandre Nagor/Lucas Royes/Naël Tyrner (SR Colmar) ont
// toujours 0 ligne matchs_joueur après le rattrapage calendrier complet
// (346 matchs insérés). Vérifie leur niveau/saison déclarés exacts.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const noms = ['Hatier', 'Roche', 'Léonard', 'Nagor', 'Royes', 'Tyrner'];
for (const nom of noms) {
  const { data: joueurs, error } = await supabase
    .from('joueurs')
    .select('id, prenom, nom, club, niveau, saison, created_at')
    .ilike('nom', `%${nom}%`);
  if (error) { console.error('Erreur :', error.message); continue; }
  for (const j of joueurs || []) {
    console.log(`${j.prenom} ${j.nom} | club="${j.club}" | niveau="${j.niveau}" | saison="${j.saison}" | created_at=${j.created_at}`);
  }
}
