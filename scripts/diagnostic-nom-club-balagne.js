// Diagnostic lecture seule : le match calendrier_officiel_id=1031
// (F.C.Balagne 1 vs Red Star Fc 2) a 18/41 lignes matchs_joueur avec des
// stats, donc des joueurs Balagne existent côté FootLight — mais une
// recherche joueurs.club ilike '%balagne%' n'en trouve aucun. Dump le
// champ club réel des joueurs rattachés à ce match pour voir l'orthographe
// exacte utilisée.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const { data: mj, error } = await supabase.from('matchs_joueur').select('joueur_id').eq('calendrier_officiel_id', 1031);
if (error) { console.error('Erreur :', error.message); process.exit(1); }
const joueurIds = [...new Set((mj || []).map((m) => m.joueur_id))];

const { data: joueurs, error: errJ } = await supabase.from('joueurs').select('id, prenom, nom, club').in('id', joueurIds);
if (errJ) { console.error('Erreur :', errJ.message); process.exit(1); }

const clubsDistincts = [...new Set((joueurs || []).map((j) => j.club))];
console.log(`Clubs distincts pour les ${joueurs.length} joueurs rattachés au match id=1031 : ${JSON.stringify(clubsDistincts)}`);
for (const club of clubsDistincts) {
  console.log(`  "${club}" : ${joueurs.filter((j) => j.club === club).length} joueur(s)`);
}
