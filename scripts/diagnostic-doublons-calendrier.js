// Diagnostic (lecture seule) : inspecte les entrées calendrier_officiel
// pour les variantes de noms "NIMES OL"/"Nîmes" et "LYON LA DUCHERE"/
// "Lyon La Duchère" (division N1), qui matchent toutes deux nos clubs
// "Nîmes Olympique" et "Lyon - La Duchère" de façon ambiguë.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspecter(nomsVariantes) {
  const { data, error } = await supabase
    .from('calendrier_officiel')
    .select('id, equipe_domicile, equipe_exterieur, date_match, division, groupe, journee, saison')
    .eq('division', 'N1')
    .or(nomsVariantes.map((n) => `equipe_domicile.eq.${n},equipe_exterieur.eq.${n}`).join(','));
  if (error) { console.error('Erreur lecture calendrier_officiel :', error.message); process.exit(1); }
  console.log(`\n${data.length} ligne(s) trouvée(s) pour [${nomsVariantes.join(', ')}] :`);
  for (const m of data.sort((a, b) => (a.journee || 0) - (b.journee || 0))) {
    console.log(`  id=${m.id} | J${m.journee} | ${m.date_match} | groupe=${m.groupe} | saison=${m.saison} | "${m.equipe_domicile}" vs "${m.equipe_exterieur}"`);
  }
}

await inspecter(['NIMES OL', 'Nîmes']);
await inspecter(['LYON LA DUCHERE', 'Lyon La Duchère']);
