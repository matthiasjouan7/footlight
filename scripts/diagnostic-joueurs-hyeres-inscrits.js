// Diagnostic lecture seule : l'utilisateur demande d'appliquer aussi le
// correctif stats FFF pour les joueurs de Hyères. Vérifie s'il existe des
// joueurs inscrits sur FootLight pour ce club (recherche large, pas
// seulement les noms exacts déjà essayés).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: joueurs, error } = await supabase
    .from('joueurs')
    .select('id, prenom, nom, club, niveau, saison')
    .ilike('club', '%hy%res%');
  if (error) { console.error('Erreur :', error.message); process.exitCode = 1; return; }
  console.log(`${joueurs.length} joueur(s) trouvé(s) avec un club contenant "hyeres"/"hyères" :`);
  const parClub = new Map();
  for (const j of joueurs) {
    if (!parClub.has(j.club)) parClub.set(j.club, []);
    parClub.get(j.club).push(j);
  }
  for (const [club, liste] of parClub) {
    console.log(`\n=== "${club}" (${liste.length} joueur(s)) ===`);
    for (const j of liste) console.log(`  ${j.prenom} ${j.nom} (niveau=${j.niveau}, saison=${j.saison})`);
  }
}

main().finally(() => process.exit(process.exitCode || 0));
