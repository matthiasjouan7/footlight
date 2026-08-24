// Diagnostic lecture seule : vérifie comment l'équipe première de Laval
// est déjà nommée dans joueurs.club, pour choisir un nom cohérent et
// distinct pour l'équipe B (Stade Laval B / National 2) qui se rapproche
// correctement via clubWordsMatch malgré l'abréviation inhabituelle du
// calendrier ("Laval Stade May. Fc" — vérifié via diagnostic-club-laval-b.js).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const { data, error } = await supabase
  .from('joueurs')
  .select('id, prenom, nom, club, niveau, saison')
  .ilike('club', '%laval%');
if (error) { console.error('Erreur lecture joueurs :', error.message); process.exit(1); }

console.log(`"laval" : ${data?.length || 0} joueur(s) trouvé(s).`);
const clubs = new Set((data || []).map((j) => `${j.club} (${j.niveau}, ${j.saison})`));
for (const c of clubs) console.log(`  - ${c}`);
