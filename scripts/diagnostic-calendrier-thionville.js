// Diagnostic (lecture seule) : affiche le calendrier généré pour un joueur
// US Thionville Lusitanos, pour vérifier manuellement (ex: contre le
// calendrier officiel FFF sur epreuves.fff.fr) que les adversaires et dates
// sont corrects, notamment le match contre Sporting Club Aubagne Air Bel.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

const { data: joueur, error: joueurError } = await supabase
  .from('joueurs').select('id, prenom, nom, club, niveau, saison')
  .ilike('club', '%thionville%').limit(1).single();
if (joueurError || !joueur) { console.error('Aucun joueur Thionville trouvé :', joueurError?.message); process.exit(1); }
console.log(`Joueur test : ${joueur.prenom} ${joueur.nom} (${joueur.club}, ${joueur.niveau}, ${joueur.saison})\n`);

const { data: matchs, error: matchsError } = await supabase
  .from('matchs_joueur').select('date_match, adversaire, domicile, competition, verifie')
  .eq('joueur_id', joueur.id).eq('saison', joueur.saison)
  .order('date_match', { ascending: true });
if (matchsError) { console.error('Erreur lecture matchs_joueur :', matchsError.message); process.exit(1); }

console.log(`${matchs.length} match(s) dans son calendrier :`);
for (const m of matchs) {
  console.log(`  ${m.date_match} | ${m.domicile ? 'DOM' : 'EXT'} vs ${m.adversaire} | ${m.competition}${m.verifie ? ' ✓ vérifié FFF' : ''}`);
}

const aubagne = matchs.find(m => /aubagne/i.test(m.adversaire || ''));
console.log(aubagne ? `\nMatch contre Aubagne trouvé : ${aubagne.date_match} (${aubagne.domicile ? 'domicile' : 'extérieur'})` : '\nAucun match contre Aubagne trouvé dans ce calendrier.');
