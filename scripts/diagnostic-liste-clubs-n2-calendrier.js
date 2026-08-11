// Diagnostic (lecture seule) ponctuel : liste tous les clubs distincts de
// calendrier_officiel (division N2), pour vérifier manuellement si des
// clubs récemment importés existent sous une forme non détectée par le
// rapprochement flou.
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

const matchs = await selectAll('calendrier_officiel', 'equipe_domicile, equipe_exterieur, groupe, saison', 'division', 'N2');
const clubs = [...new Set((matchs || []).flatMap((m) => [m.equipe_domicile, m.equipe_exterieur]).filter(Boolean))].sort();
const groupes = [...new Set((matchs || []).map((m) => m.groupe).filter(Boolean))].sort();
const saisons = [...new Set((matchs || []).map((m) => m.saison).filter(Boolean))].sort();

console.log(`${matchs.length} ligne(s) dans calendrier_officiel (division N2).`);
console.log(`Saisons présentes : ${saisons.join(', ')}`);
console.log(`Groupes présents : ${groupes.join(', ')}\n`);
console.log(`${clubs.length} club(s) distinct(s) :`);
for (const c of clubs) console.log(`  ${c}`);
