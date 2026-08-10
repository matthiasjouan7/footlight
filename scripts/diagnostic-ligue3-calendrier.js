// Diagnostic (lecture seule) : état des lignes calendrier_officiel pour la
// division "Ligue 3" — vérifie si les journées avancent bien semaine après
// semaine (suite au signalement : "Match de ligue 3 rien n'est mis à jour").
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

const { data, error } = await supabase
  .from('calendrier_officiel')
  .select('equipe_domicile, equipe_exterieur, date_match, journee, groupe, saison, created_at')
  .eq('division', 'Ligue 3')
  .order('date_match', { ascending: true });

if (error) { console.error('Erreur :', error.message); process.exit(1); }

console.log(`${data.length} ligne(s) Ligue 3 en base.\n`);

const parJournee = {};
for (const m of data) {
  const key = `J${m.journee} (${m.date_match})`;
  parJournee[key] = (parJournee[key] || 0) + 1;
}
console.log('Répartition par journée :');
for (const [k, v] of Object.entries(parJournee)) console.log(`  ${k} : ${v} match(s)`);

console.log('\nDétail :');
for (const m of data) {
  console.log(`  J${m.journee} | ${m.date_match} | ${m.equipe_domicile} vs ${m.equipe_exterieur} | groupe="${m.groupe}" | saison=${m.saison} | créé le ${m.created_at}`);
}
