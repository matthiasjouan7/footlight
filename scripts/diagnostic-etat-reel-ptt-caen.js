// Diagnostic lecture seule : vérifie l'état RÉEL (matchs_joues) des 24
// joueurs FootLight "AS PTT Caen" — la ligne calendrier_officiel id=855
// a déjà 43 lignes matchs_joueur dont 26 avec minutes_jouees renseigné,
// suggérant que les stats sont peut-être déjà correctement écrites
// malgré le rapport "manquant" du diagnostic joueurs-manquants (qui
// pourrait souffrir d'un problème de timing de rendu de page lors du
// balayage de 55 pages, plutôt que d'un vrai problème de données).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const { data: joueurs, error } = await supabase
  .from('joueurs')
  .select('prenom, nom, matchs_joues')
  .eq('niveau', 'N2').eq('saison', '2026-2027').eq('club', 'AS PTT Caen')
  .order('nom');
if (error) { console.error('Erreur :', error.message); process.exit(1); }
console.log(`${joueurs.length} joueur(s) "AS PTT Caen" :`);
joueurs.forEach((j) => console.log(`  ${j.prenom} ${j.nom} : matchs_joues=${j.matchs_joues}`));
const avecMatch = joueurs.filter((j) => (j.matchs_joues || 0) > 0).length;
console.log(`\n${avecMatch}/${joueurs.length} joueur(s) avec matchs_joues > 0.`);
