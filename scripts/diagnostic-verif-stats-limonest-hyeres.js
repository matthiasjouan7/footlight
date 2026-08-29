// Diagnostic lecture seule : vérifie l'état actuel de joueurs.matchs_joues
// et des matchs_joueur (minutes_jouees renseignées ou non) pour FC Limonest
// et HYERES F.C. après le rattrapage stats (journées 1-2, National 1 groupe C).
// Sert à comprendre pourquoi le site affiche toujours 0 malgré le run réussi.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: joueurs, error: errJ } = await supabase
    .from('joueurs')
    .select('id, prenom, nom, club, saison, niveau, matchs_joues, buts, minutes_jouees')
    .in('club', ['FC Limonest', 'HYERES F.C.', 'Hyères'])
    .eq('saison', '2026-2027');
  if (errJ) { console.error('Erreur joueurs :', errJ.message); process.exitCode = 1; return; }

  console.log(`${joueurs.length} joueur(s) trouvés pour ces clubs.\n`);
  const parClub = new Map();
  for (const j of joueurs) {
    if (!parClub.has(j.club)) parClub.set(j.club, []);
    parClub.get(j.club).push(j);
  }
  for (const [club, liste] of parClub) {
    console.log(`=== ${club} (${liste.length} joueur(s)) ===`);
    for (const j of liste) {
      console.log(`  ${j.prenom} ${j.nom} (id=${j.id}, niveau=${j.niveau}) : matchs_joues=${j.matchs_joues}, buts=${j.buts}, minutes_jouees=${j.minutes_jouees}`);
    }
    console.log('');
  }

  const idsJoueurs = joueurs.map((j) => j.id);
  const { data: mj, error: errMj } = await supabase
    .from('matchs_joueur')
    .select('id, joueur_id, calendrier_officiel_id, date_match, adversaire, minutes_jouees')
    .in('joueur_id', idsJoueurs);
  if (errMj) { console.error('Erreur matchs_joueur :', errMj.message); process.exitCode = 1; return; }

  console.log(`\n${mj.length} ligne(s) matchs_joueur au total pour ces joueurs.`);
  const avecMinutes = mj.filter((m) => m.minutes_jouees !== null && m.minutes_jouees !== undefined);
  const sansMinutes = mj.filter((m) => m.minutes_jouees === null || m.minutes_jouees === undefined);
  console.log(`  ${avecMinutes.length} avec minutes_jouees renseignées.`);
  console.log(`  ${sansMinutes.length} sans minutes_jouees (null).`);

  console.log('\n--- Exemple de 10 lignes sans minutes_jouees ---');
  for (const m of sansMinutes.slice(0, 10)) {
    console.log(`  joueur_id=${m.joueur_id} date_match=${m.date_match} adversaire="${m.adversaire}" calendrier_officiel_id=${m.calendrier_officiel_id}`);
  }
}

main().finally(() => process.exit(process.exitCode || 0));
