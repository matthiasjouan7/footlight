// Diagnostic (lecture seule) : montre le format exact des noms d'équipe
// stockés dans calendrier_officiel pour une division/groupe/saison, afin de
// savoir quelle source de noms (page calendrier scrapée vs specifics.equipe.nom
// de la page match-direct) correspond, avant de corriger le rapprochement
// cassé par le bug cheerio sur ".TeamScore".
import { createClient } from '@supabase/supabase-js';

const division = process.env.DIVISION || 'N1';
const groupe = process.env.GROUPE || 'A';
const saison = process.env.SAISON || '2026-2027';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);
const { data, error } = await supabase
  .from('calendrier_officiel')
  .select('equipe_domicile, equipe_exterieur, date_match, division, groupe, saison')
  .eq('division', division)
  .eq('groupe', groupe)
  .eq('saison', saison)
  .order('date_match', { ascending: true })
  .limit(10);

if (error) { console.error('Erreur :', error.message); process.exit(1); }
console.log(`${data.length} ligne(s) trouvée(s) pour ${division} groupe ${groupe} saison ${saison} :\n`);
data.forEach((r) => console.log(`"${r.equipe_domicile}" vs "${r.equipe_exterieur}" — ${r.date_match}`));
