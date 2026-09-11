// Diagnostic lecture seule : l'utilisateur signale que les deux fiches
// "Tiécoro Keita" retrouvées côté N2 groupe G (Olympique Marseille 2 vs
// Espaly 1) ne sont pas deux joueurs homonymes mais bien LA MÊME personne
// entrée en double dans joueurs. Dump les deux fiches + tout leur
// historique matchs_joueur pour évaluer une fusion.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const { data: joueurs, error } = await supabase
  .from('joueurs')
  .select('*')
  .ilike('nom', '%keita%')
  .ilike('prenom', '%tiecoro%');
if (error) { console.error('Erreur :', error.message); process.exit(1); }

console.log(`${(joueurs || []).length} fiche(s) "Tiécoro Keita" trouvée(s) :\n`);
for (const j of joueurs || []) {
  console.log(JSON.stringify(j, null, 2));
  const { data: mj } = await supabase
    .from('matchs_joueur')
    .select('id, calendrier_officiel_id, saison, minutes_jouees, titulaire, buts, cartons_jaunes, cartons_rouges')
    .eq('joueur_id', j.id)
    .order('calendrier_officiel_id');
  console.log(`  -> ${(mj || []).length} ligne(s) matchs_joueur :`);
  for (const m of mj || []) {
    console.log(`     id=${m.id} calendrier_officiel_id=${m.calendrier_officiel_id} saison=${m.saison} minutes=${m.minutes_jouees} titulaire=${m.titulaire} buts=${m.buts} jaunes=${m.cartons_jaunes} rouges=${m.cartons_rouges}`);
  }
  console.log('');
}
