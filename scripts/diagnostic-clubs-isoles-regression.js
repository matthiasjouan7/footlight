// Diagnostic lecture seule : plusieurs clubs isolés (FC DIEPPE, US CHANTILLY,
// US ST MAUR LUSITANOS, Us Le Pays Du Valois, Lorient, Chauray, Chateaubriant,
// Pontivy, GRAND OUEST ASSOCIAT, ANDREZIEUX-BOUTHEON, UNION FOOT TOURAINE,
// ST-PRIEST, AS ST PRIEST, US ST MALO) affichent mj=0.0 dans le scan complet
// alors que la logique de rapprochement floue (clubsCorrespondent) reconnaît
// bien ces orthographes comme identiques au club canonique (vérifié hors
// base). Pour les 6 clubs déjà "corrigés" une fois via genere-calendrier-club.js
// (write=true confirmé), le nouveau mj=0.0 est une régression inexpliquée.
// Vérifie pour chaque joueur : son id exact, ses lignes matchs_joueur
// (toutes saisons confondues, avec timestamps), et son matchs_joues actuel.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const SAISON = '2026-2027';
const CLUBS = [
  'FC DIEPPE', 'US CHANTILLY', 'US ST MAUR LUSITANOS', 'Us Le Pays Du Valois',
  'Lorient', 'Chauray', 'Chateaubriant', 'Pontivy', 'GRAND OUEST ASSOCIAT',
  'ANDREZIEUX-BOUTHEON', 'UNION FOOT TOURAINE', 'ST-PRIEST', 'AS ST PRIEST', 'US ST MALO',
];

for (const club of CLUBS) {
  const { data: joueurs, error } = await supabase
    .from('joueurs')
    .select('id, prenom, nom, club, niveau, saison, matchs_joues, created_at, updated_at')
    .eq('club', club)
    .eq('niveau', 'N1');
  if (error) { console.error(`Erreur joueurs (${club}) :`, error.message); continue; }
  if (!joueurs.length) { console.log(`\n=== "${club}" : 0 joueur trouvé (niveau N1, toutes saisons) ===`); continue; }

  console.log(`\n=== "${club}" : ${joueurs.length} joueur(s) ===`);
  for (const j of joueurs) {
    const { data: mj, error: errMj } = await supabase
      .from('matchs_joueur')
      .select('id, saison, date_match, adversaire, minutes_jouees, calendrier_officiel_id, created_at')
      .eq('joueur_id', j.id)
      .order('date_match', { ascending: true });
    if (errMj) { console.log(`  ${j.prenom} ${j.nom} : erreur matchs_joueur : ${errMj.message}`); continue; }
    console.log(`  ${j.prenom} ${j.nom} (id=${j.id}, joueur.saison=${j.saison}, matchs_joues=${j.matchs_joues}, updated_at=${j.updated_at})`);
    console.log(`    ${mj.length} ligne(s) matchs_joueur au total (toutes saisons) :`);
    for (const m of mj.slice(0, 6)) {
      console.log(`      id=${m.id} saison=${m.saison} date=${m.date_match} adv=${m.adversaire} min=${m.minutes_jouees} cal_id=${m.calendrier_officiel_id} created_at=${m.created_at}`);
    }
    if (mj.length > 6) console.log(`      ... ${mj.length - 6} autre(s) ligne(s)`);
  }
}
