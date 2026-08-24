// Diagnostic lecture seule : détail complet des deux fiches Ouhammou
// (doublon signalé par l'utilisateur, effectif Deauville) pour décider
// laquelle conserver avant suppression.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const IDS = [
  '5983b407-bbd0-45c3-a70c-9b189169c58a', // Yannis Ouhammou, AS Trouville-Deauville-Villers
  '03e0a2fb-4518-432d-af80-3ab867501d93', // Yanis Ouhammou, Deauville
];

const { data, error } = await supabase.from('joueurs').select('*').in('id', IDS);
if (error) { console.error('Erreur lecture joueurs :', error.message); process.exit(1); }

for (const j of data || []) {
  console.log(`\n--- ${j.prenom} ${j.nom} (id=${j.id}) ---`);
  console.log(JSON.stringify(j, null, 2));
}

// Vérifie aussi les lignes matchs_joueur liées à chaque id (calendrier déjà généré ?)
for (const id of IDS) {
  const { count, error: errMj } = await supabase
    .from('matchs_joueur').select('id', { count: 'exact', head: true }).eq('joueur_id', id);
  if (errMj) { console.error(`Erreur lecture matchs_joueur pour ${id} :`, errMj.message); continue; }
  console.log(`\nmatchs_joueur pour id=${id} : ${count ?? 0} ligne(s)`);
}
