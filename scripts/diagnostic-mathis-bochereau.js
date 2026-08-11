// Diagnostic (lecture seule) : recherche toutes les fiches "Mathis
// Bochereau" en base, pour vérifier s'il s'agit d'un homonyme déjà présent
// sous "Les Sables Vendée Football" en plus de celui d'Olympique Saumur.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

function normalizeName(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}

let joueurs = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase.from('joueurs').select('id, prenom, nom, club, niveau, poste, email, date_naissance').range(from, from + 999);
  if (error) { console.error('Erreur lecture joueurs :', error.message); process.exit(1); }
  if (!data || !data.length) break;
  joueurs = joueurs.concat(data);
  if (data.length < 1000) break;
}

const matches = joueurs.filter((j) => normalizeName(j.prenom) === 'mathis' && normalizeName(j.nom) === 'bochereau');
console.log(`${matches.length} fiche(s) "Mathis Bochereau" trouvée(s) :`);
for (const m of matches) {
  console.log(`  id=${m.id} | club="${m.club}" | niveau="${m.niveau}" | poste="${m.poste}" | né(e) le ${m.date_naissance} | email=${m.email}`);
}
console.log('\nTerminé.');
