// Vérification homonyme avant l'ajout de Ruben Rosa (QRM, Ligue 3),
// demandé par l'utilisateur (capture d'écran source, ex-non-inscrit
// détecté dans diagnostic-buteurs-non-inscrits.js : "R. Rosa — 1 but(s)").
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const { data, error } = await supabase.from('joueurs').select('id, prenom, nom, club, niveau, saison, date_naissance').ilike('nom', '%rosa%');
if (error) { console.error('Erreur :', error.message); process.exit(1); }
console.log(`${data.length} fiche(s) "Rosa" trouvée(s) :`);
for (const j of data) console.log(`  ${j.prenom} ${j.nom} — club="${j.club}" niveau="${j.niveau}" saison="${j.saison}" né(e)=${j.date_naissance}`);
