// Diagnostic (lecture seule) : cherche dans calendrier_officiel (division N2)
// les entrées proches de "Bourgoin" et "Romorantin"/"Sologne", pour
// comprendre pourquoi FC Bourgoin-Jallieu et Sologne Football Romorantin 41
// ne matchent pas avec la logique de production.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

async function selectAll(table, columns, filterColumn, filterValue) {
  const pageSize = 1000;
  let toutes = [];
  let page = 0;
  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .eq(filterColumn, filterValue)
      .range(page * pageSize, page * pageSize + pageSize - 1);
    if (error) { console.error(`Erreur lecture ${table} :`, error.message); process.exit(1); }
    toutes = toutes.concat(data || []);
    if (!data || data.length < pageSize) break;
    page++;
  }
  return toutes;
}

const matchs = await selectAll('calendrier_officiel', 'equipe_domicile, equipe_exterieur', 'division', 'N2');
const clubsCalendrier = [...new Set((matchs || []).flatMap((m) => [m.equipe_domicile, m.equipe_exterieur]).filter(Boolean))].sort();

const motsCherches = ['bourgoin', 'jallieu', 'romorantin', 'sologne', 'chantilly'];
for (const mot of motsCherches) {
  const trouves = clubsCalendrier.filter((c) => c.toLowerCase().includes(mot));
  console.log(`Clubs calendrier contenant "${mot}" : ${trouves.length ? trouves.map((c) => `"${c}"`).join(', ') : '(aucun)'}`);
}
