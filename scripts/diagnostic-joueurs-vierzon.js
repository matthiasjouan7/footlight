// Diagnostic (lecture seule) : liste tous les joueurs actuellement en base
// sous un nom de club "Vierzon" (raccourci), pour préparer leur
// harmonisation vers "Vierzon Football Club" avant l'import du nouvel
// effectif.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

let joueurs = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase.from('joueurs').select('id, prenom, nom, club, niveau, poste, date_naissance').range(from, from + 999);
  if (error) { console.error('Erreur lecture joueurs :', error.message); process.exit(1); }
  if (!data || !data.length) break;
  joueurs = joueurs.concat(data);
  if (data.length < 1000) break;
}

const matches = joueurs.filter((j) => (j.club || '').toLowerCase().includes('vierzon'));
console.log(`${matches.length} joueur(s) trouvé(s) avec un club contenant "Vierzon" :`);
for (const m of matches) {
  console.log(`  id=${m.id} | ${m.prenom} ${m.nom} | club="${m.club}" | niveau="${m.niveau}" | poste="${m.poste}" | né(e) le ${m.date_naissance}`);
}
console.log('\nTerminé.');
