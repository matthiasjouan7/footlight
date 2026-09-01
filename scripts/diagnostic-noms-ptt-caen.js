// Diagnostic lecture seule : liste les prenom/nom exacts des 24 joueurs
// FootLight inscrits sous "AS PTT Caen" (N2), pour comparer avec les 16
// noms FFF listés comme "manquants" (AMADOU DIOP, ANTOINE LIARD...) et
// déterminer si c'est un vrai désaccord d'individus ou un résidu de bug
// de rapprochement de nom.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const { data, error } = await supabase
  .from('joueurs')
  .select('prenom, nom')
  .eq('niveau', 'N2').eq('saison', '2026-2027').eq('club', 'AS PTT Caen')
  .order('nom');
if (error) { console.error('Erreur :', error.message); process.exit(1); }
console.log(`${data.length} joueur(s) FootLight "AS PTT Caen" :`);
data.forEach((j) => console.log(`  ${j.prenom} ${j.nom}`));
