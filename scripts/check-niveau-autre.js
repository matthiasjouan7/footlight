// Diagnostic lecture seule : liste les joueurs dont niveau = "Autre",
// valeur retirée du formulaire (remplacée par "Étranger"/"Sans club") —
// pour savoir s'il faut réaffecter des joueurs existants avant de
// supprimer l'option des menus.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const { data, error } = await supabase.from('joueurs').select('id, prenom, nom, club, niveau, saison').eq('niveau', 'Autre');
if (error) { console.error('Erreur lecture :', error.message); process.exit(1); }

console.log(`${data?.length || 0} joueur(s) avec niveau = "Autre" :\n`);
for (const j of data || []) {
  console.log(`  ${j.prenom} ${j.nom} — club "${j.club || '—'}" — saison ${j.saison || '—'} — id ${j.id}`);
}
