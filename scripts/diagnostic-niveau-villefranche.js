// Diagnostic lecture seule : l'utilisateur signale 3 joueurs inscrits à
// FC Villefranche Beaujolais. Dembo Gassama avait un niveau erroné ("N1"
// au lieu de "Ligue 3", corrigé par corrige-niveau-gassama.js) — vérifie
// si les 2 autres joueurs du club ont le même problème avant de les
// considérer comme sains.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const { data, error } = await supabase
  .from('joueurs')
  .select('id, prenom, nom, club, niveau, saison, matchs_joues')
  .ilike('club', '%villefranche%')
  .eq('saison', '2026-2027');
if (error) { console.error('Erreur :', error.message); process.exit(1); }
console.log(`${data.length} joueur(s) "Villefranche" (saison 2026-2027) :`);
for (const j of data) console.log(`  ${j.prenom} ${j.nom} — club="${j.club}" niveau="${j.niveau}" matchs_joues=${j.matchs_joues}`);
