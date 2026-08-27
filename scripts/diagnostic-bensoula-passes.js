// Diagnostic (lecture seule) : pourquoi Kamil Bensoula (VFC La Roche-sur-Yon,
// Ligue 3) affiche toujours 0 passes décisives malgré 3 matchs joués.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const { data: joueurs, error: errJ } = await supabase.from('joueurs').select('*').ilike('nom', '%bensoula%');
if (errJ) { console.error('Erreur joueurs :', errJ.message); process.exit(1); }
console.log(`${joueurs.length} joueur(s) trouvé(s) pour "bensoula".`);
for (const j of joueurs) {
  console.log(`\n=== ${j.prenom} ${j.nom} (id=${j.id}) ===`);
  console.log(`  club="${j.club}" niveau="${j.niveau}" saison="${j.saison}" passes_decisives(agrégat joueurs)=${j.passes_decisives}`);

  const { data: mj, error: errMj } = await supabase.from('matchs_joueur').select('id, date_match, adversaire, passes_decisives, buts, calendrier_officiel_id, verifie').eq('joueur_id', j.id).order('date_match');
  if (errMj) { console.log(`  Erreur matchs_joueur : ${errMj.message}`); continue; }
  console.log(`  ${mj.length} matchs_joueur :`);
  for (const m of mj) {
    console.log(`    ${m.date_match} vs ${m.adversaire} — passes_decisives=${JSON.stringify(m.passes_decisives)} (type ${typeof m.passes_decisives}), buts=${m.buts}, calendrier_officiel_id=${m.calendrier_officiel_id}, verifie=${m.verifie}`);
  }
}
