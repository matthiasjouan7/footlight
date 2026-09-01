// Diagnostic (lecture seule) : le scan clubs N2 montre joues=0.0 pour
// pratiquement tous les clubs N2 malgré un calendrier généré (mj~24-26).
// Objectif : déterminer si les lignes matchs_joueur ont bien minutes_jouees
// renseigné (auto-sync quotidien qui fonctionne, il ne manque que le
// recalcul de l'agrégat joueurs.matchs_joues) ou si minutes_jouees est
// toujours null (l'auto-sync ne fonctionne pas réellement pour N2).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const SAISON = '2026-2027';

async function main() {
  const { data: joueurs, error } = await supabase
    .from('joueurs')
    .select('id, prenom, nom, club, matchs_joues')
    .eq('niveau', 'N2')
    .eq('saison', SAISON)
    .limit(10);
  if (error) { console.error('Erreur joueurs :', error.message); process.exit(1); }

  for (const j of joueurs) {
    const { data: matchs, error: errM } = await supabase
      .from('matchs_joueur')
      .select('minutes_jouees, date_match')
      .eq('joueur_id', j.id)
      .eq('saison', SAISON);
    if (errM) { console.error(`Erreur matchs pour ${j.prenom} ${j.nom} :`, errM.message); continue; }
    const total = (matchs || []).length;
    const avecMinutes = (matchs || []).filter((m) => m.minutes_jouees != null).length;
    console.log(`${j.prenom} ${j.nom} (${j.club}) : matchs_joueur=${total}, avec minutes_jouees=${avecMinutes}, joueurs.matchs_joues=${j.matchs_joues}`);
  }
}

main().finally(() => process.exit(process.exitCode || 0));
