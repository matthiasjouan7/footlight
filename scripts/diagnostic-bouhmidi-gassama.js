// Diagnostic lecture seule, deux cas signalés par l'utilisateur :
// 1. "Bouhmidi" : le site foot-direct affiche littéralement "M. Bouhmidi"
//    (confirmé, pas un bug de lecture), mais l'utilisateur dit "Karim"
//    (K.) — vérifie s'il existe une fiche FootLight "Karim Bouhmidi" (nom/
//    club/niveau/saison), pour savoir si c'est la même personne (écart
//    d'initiale côté foot-direct) ou un homonyme distinct non inscrit.
// 2. "Gassama" : l'utilisateur dit que "Dembo Gassama" est bien inscrit,
//    contrairement à ce qu'a rapporté diagnostic-buteurs-non-inscrits.js
//    ("D. Gassama" sans correspondance) — cherche sa fiche tous niveaux/
//    saisons confondus pour comprendre l'écart (mauvais niveau, comme pour
//    Ahmed Majid ?) et l'état de son calendrier/stats.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

for (const nomRecherche of ['bouhmidi', 'gassama']) {
  const { data, error } = await supabase.from('joueurs').select('*').ilike('nom', `%${nomRecherche}%`);
  if (error) { console.error(`Erreur (${nomRecherche}) :`, error.message); continue; }
  console.log(`\n=== "${nomRecherche}" : ${data.length} fiche(s) ===`);
  for (const j of data) {
    console.log(`  id=${j.id}`);
    console.log(`  ${j.prenom} ${j.nom} — club="${j.club}" niveau="${j.niveau}" saison="${j.saison}"`);
    console.log(`  matchs_joues=${j.matchs_joues} buts=${j.buts} profil_public=${j.profil_public}`);
    const { data: mj } = await supabase.from('matchs_joueur').select('id').eq('joueur_id', j.id);
    console.log(`  ${mj?.length || 0} ligne(s) matchs_joueur.`);
  }
}
