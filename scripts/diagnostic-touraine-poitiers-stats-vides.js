// Diagnostic lecture seule : pourquoi le rattrapage lequipe.fr trouve bien
// la rencontre "Limonest vs UF Touraine" (20 joueurs) mais aucun des joueurs
// FootLight de l'Union Foot de Touraine n'y figure. Liste toutes les lignes
// calendrier_officiel du groupe C autour du 2026-08-29 et, pour chacune,
// combien de matchs_joueur pointent vers elle (et de quel club).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const SAISON = '2026-2027';

const { data: cal, error: errCal } = await supabase
  .from('calendrier_officiel')
  .select('id, groupe, journee, date_match, equipe_domicile, equipe_exterieur')
  .eq('saison', SAISON)
  .eq('division', 'N1')
  .eq('groupe', 'C')
  .gte('date_match', '2026-08-27')
  .lte('date_match', '2026-08-31');
if (errCal) { console.error(errCal.message); process.exit(1); }
console.log(`${cal.length} ligne(s) calendrier_officiel N1/C entre le 27 et le 31/08.`);

for (const r of cal) {
  const { data: mj, error: errMj } = await supabase
    .from('matchs_joueur')
    .select('id, joueur_id')
    .eq('calendrier_officiel_id', r.id);
  if (errMj) { console.log(`  id=${r.id} erreur: ${errMj.message}`); continue; }
  const joueurIds = [...new Set(mj.map((m) => m.joueur_id))];
  let clubs = [];
  if (joueurIds.length) {
    const { data: joueurs } = await supabase.from('joueurs').select('id, club').in('id', joueurIds);
    const parClub = new Map();
    for (const j of joueurs || []) parClub.set(j.club, (parClub.get(j.club) || 0) + 1);
    clubs = [...parClub.entries()].map(([c, n]) => `${c}:${n}`);
  }
  console.log(`  id=${r.id} j${r.journee} date=${r.date_match} "${r.equipe_domicile}" vs "${r.equipe_exterieur}" -> ${mj.length} matchs_joueur (${clubs.join(', ') || 'aucun'})`);
}
