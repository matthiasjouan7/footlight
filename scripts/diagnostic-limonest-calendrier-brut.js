// Diagnostic lecture seule : FC Limonest n'a qu'1 seule ligne calendrier
// correspondante via clubWordsMatch (sur ~30-32 attendues), alors que
// Hyères 83 FC en a 32 sans souci. Recherche BRUTE (ilike, sans passer par
// clubWordsMatch) de "limonest" dans calendrier_officiel toutes divisions/
// saisons confondues, pour voir si le calendrier de ce club est
// simplement incomplet en base, ou existe ailleurs sous un autre nom/
// division/groupe qui échappe au rapprochement habituel.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase
    .from('calendrier_officiel')
    .select('id, equipe_domicile, equipe_exterieur, date_match, division, groupe, saison')
    .or('equipe_domicile.ilike.%limonest%,equipe_exterieur.ilike.%limonest%');
  if (error) { console.error('Erreur :', error.message); process.exitCode = 1; return; }
  console.log(`${data.length} ligne(s) calendrier_officiel contenant "limonest" (toutes divisions/saisons/groupes) :\n`);
  for (const r of data.sort((a, b) => (a.date_match || '').localeCompare(b.date_match || ''))) {
    console.log(`  id=${r.id} | ${r.date_match} | "${r.equipe_domicile}" vs "${r.equipe_exterieur}" | division=${r.division} groupe=${r.groupe} saison=${r.saison}`);
  }

  console.log('\n=== Groupes présents en N1 2026-2027 ===');
  const { data: n1, error: errN1 } = await supabase
    .from('calendrier_officiel')
    .select('groupe')
    .eq('division', 'N1')
    .eq('saison', '2026-2027');
  if (errN1) { console.error('Erreur :', errN1.message); process.exitCode = 1; return; }
  const groupes = new Map();
  for (const r of n1) groupes.set(r.groupe, (groupes.get(r.groupe) || 0) + 1);
  for (const [g, n] of groupes) console.log(`  groupe "${g}" : ${n} ligne(s)`);
}

main().finally(() => process.exit(process.exitCode || 0));
