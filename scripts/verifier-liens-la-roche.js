// Diagnostic (lecture seule) : détail des liens matchs_joueur sur les deux
// lignes calendrier_officiel en doublon pour La Roche-sur-Yon vs Versailles
// (2026-08-07), pour décider comment les consolider sans casser de données
// joueur existantes.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);
const ids = [1942, 2777];

const { data: liens, error } = await supabase
  .from('matchs_joueur')
  .select('*')
  .in('calendrier_officiel_id', ids);
if (error) { console.error('Erreur :', error.message); process.exit(1); }

console.log(`${liens.length} lien(s) trouvé(s) :`);
for (const l of liens) {
  const { data: j } = await supabase.from('joueurs').select('prenom, nom, club').eq('id', l.joueur_id).single();
  console.log(`matchs_joueur.id=${l.id} | calendrier_officiel_id=${l.calendrier_officiel_id} | joueur=${j?.prenom} ${j?.nom} (${j?.club}) | domicile=${l.domicile} | buts=${l.buts} | minutes=${l.minutes_jouees}`);
}
