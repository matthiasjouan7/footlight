// Diagnostic lecture seule : vérifie l'état RÉEL (matchs_joues) des
// joueurs FootLight "Aubervilliers" (N2), sur le même modèle que
// diagnostic-etat-reel-ptt-caen.js. Objectif : déterminer si le rapport
// "manquant" du diagnostic joueurs-manquants pour Aubervilliers est un
// vrai trou de données ou, comme pour AS PTT Caen, en partie un faux
// positif de l'outil (des joueurs déjà correctement synchronisés).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const { data: joueurs, error } = await supabase
  .from('joueurs')
  .select('prenom, nom, club, matchs_joues')
  .eq('niveau', 'N2').eq('saison', '2026-2027')
  .ilike('club', '%aubervilliers%')
  .order('nom');
if (error) { console.error('Erreur :', error.message); process.exit(1); }
console.log(`${joueurs.length} joueur(s) "Aubervilliers" :`);
joueurs.forEach((j) => console.log(`  ${j.prenom} ${j.nom} (club="${j.club}") : matchs_joues=${j.matchs_joues}`));
const avecMatch = joueurs.filter((j) => (j.matchs_joues || 0) > 0).length;
console.log(`\n${avecMatch}/${joueurs.length} joueur(s) avec matchs_joues > 0.`);
