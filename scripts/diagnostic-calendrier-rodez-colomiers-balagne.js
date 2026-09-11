// Diagnostic lecture seule complémentaire : Balagne a 0 joueur enregistré
// côté FootLight (donc rien à synchroniser pour ce club, ce n'est pas un
// bug). Pour Rodez et Colomiers, liste tous les matchs calendrier_officiel
// et pour chacun le nombre de lignes matchs_joueur avec/sans minutes, afin
// de voir precisement quel(s) match(s) manque(nt) encore de stats.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const SAISON = '2026-2027';

function normalise(s) { return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }

const { data: cal, error } = await supabase
  .from('calendrier_officiel')
  .select('id, groupe, date_match, equipe_domicile, equipe_exterieur')
  .eq('division', 'N2').eq('saison', SAISON);
if (error) { console.error('Erreur :', error.message); process.exit(1); }

const motsCles = ['balagne', 'rodez', 'colomiers'];
const matchs = (cal || []).filter((c) => motsCles.some((m) => normalise(c.equipe_domicile).includes(m) || normalise(c.equipe_exterieur).includes(m)));
matchs.sort((a, b) => new Date(a.date_match) - new Date(b.date_match));

for (const m of matchs) {
  const { data: mj } = await supabase.from('matchs_joueur').select('id, minutes_jouees').eq('calendrier_officiel_id', m.id);
  const total = (mj || []).length;
  const avecMinutes = (mj || []).filter((x) => x.minutes_jouees != null).length;
  console.log(`${m.date_match} groupe ${m.groupe} — ${m.equipe_domicile} vs ${m.equipe_exterieur} (id=${m.id}) : ${avecMinutes}/${total} ligne(s) avec minutes`);
}
