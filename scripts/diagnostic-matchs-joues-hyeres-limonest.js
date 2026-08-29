// Diagnostic lecture seule : l'utilisateur signale que les joueurs de
// Hyères et Limonest sont "toujours à 0" sur le site. Or leur historique
// matchs_joueur (fixtures) est désormais complet (32-34 lignes chacun).
// Hypothèse : le "0" affiché est le total de saison stocké
// (joueurs.matchs_joues), qui n'est mis à jour QUE par la synchro stats
// lequipe.fr (buts/cartons/minutes_jouees) via contributionMatch/
// appliquerDeltaSaison — pas par la simple présence de fixtures dans
// matchs_joueur. Vérifie directement : le champ joueurs.matchs_joues, et
// si minutes_jouees est renseigné sur les journées déjà jouées.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const SAISON = '2026-2027';

async function main() {
  const { data: joueurs, error: errJ } = await supabase
    .from('joueurs')
    .select('id, prenom, nom, club, matchs_joues, buts, minutes_jouees')
    .or('club.ilike.%limonest%,club.ilike.%hyeres%,club.ilike.%hyères%')
    .eq('saison', SAISON)
    .limit(6);
  if (errJ) { console.error('Erreur joueurs :', errJ.message); process.exitCode = 1; return; }

  for (const j of joueurs) {
    console.log(`\n${j.prenom} ${j.nom} (club="${j.club}") — joueurs.matchs_joues=${j.matchs_joues} joueurs.buts=${j.buts} joueurs.minutes_jouees=${j.minutes_jouees}`);
    const { data: mj, error: errMj } = await supabase
      .from('matchs_joueur')
      .select('date_match, adversaire, minutes_jouees, buts, verifie')
      .eq('joueur_id', j.id).eq('saison', SAISON)
      .order('date_match', { ascending: true })
      .limit(5);
    if (errMj) { console.log('  Erreur matchs_joueur :', errMj.message); continue; }
    for (const m of mj) {
      console.log(`  ${m.date_match} vs ${m.adversaire} — minutes_jouees=${m.minutes_jouees} buts=${m.buts} verifie=${m.verifie}`);
    }
  }
}

main().finally(() => process.exit(process.exitCode || 0));
