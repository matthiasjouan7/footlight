// Diagnostic (lecture seule) : affiche toutes les lignes de calendrier_officiel
// correspondant à un club donné, pour voir pourquoi deux variantes de nom
// (ex: "SM CAEN" et "Caen") ne sont pas détectées comme doublons par
// nettoyer-doublons-calendrier.js (qui groupe par date+division+groupe+saison
// avant de comparer les noms — un écart sur l'un de ces champs empêche la
// comparaison).
import { createClient } from '@supabase/supabase-js';

const clubRecherche = process.env.CLUB_RECHERCHE;
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!clubRecherche) { console.error('CLUB_RECHERCHE manquant.'); process.exit(1); }
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

const { data, error } = await supabase
  .from('calendrier_officiel')
  .select('*')
  .or(`equipe_domicile.ilike.%${clubRecherche}%,equipe_exterieur.ilike.%${clubRecherche}%`)
  .order('date_match', { ascending: true });

if (error) { console.error('Erreur :', error.message); process.exit(1); }

console.log(`${data.length} ligne(s) trouvée(s) pour "${clubRecherche}" :\n`);
for (const r of data) {
  console.log(`id=${r.id} | date=${r.date_match} | division="${r.division}" | groupe="${r.groupe}" | saison="${r.saison}" | domicile="${r.equipe_domicile}" | exterieur="${r.equipe_exterieur}" | created_at=${r.created_at}`);
}
