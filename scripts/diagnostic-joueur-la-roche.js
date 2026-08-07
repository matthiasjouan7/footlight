// Diagnostic (lecture seule) : profil et historique de matchs du joueur
// La Roche-sur-Yon identifié précédemment (joueur_id connu via
// verifier-liens-la-roche.js), pour comprendre pourquoi "Générer mon
// calendrier" n'a rempli qu'un seul match (Versailles) au lieu de toute
// la saison alors que calendrier_officiel contient bien les 34 journées
// Ligue 3 pour VENDEE FC LA ROCHE/YON.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);
const JOUEUR_ID = process.env.JOUEUR_ID || 'e58e3d5b-4fa9-48b9-8918-37d92e270f22';

const { data: j, error: jErr } = await supabase.from('joueurs').select('*').eq('id', JOUEUR_ID).single();
if (jErr) { console.error('Erreur lecture joueur :', jErr.message); process.exit(1); }
console.log('Profil joueur :');
console.log(`  prenom="${j.prenom}" nom="${j.nom}" club="${j.club}" niveau="${j.niveau}" saison="${j.saison}"`);

const { data: matchs, error: mErr } = await supabase
  .from('matchs_joueur')
  .select('*')
  .eq('joueur_id', JOUEUR_ID)
  .order('date_match', { ascending: true });
if (mErr) { console.error('Erreur lecture matchs_joueur :', mErr.message); process.exit(1); }

console.log(`\n${matchs.length} match(s) en base pour ce joueur :`);
for (const m of matchs) {
  console.log(`  id=${m.id} | saison="${m.saison}" | date=${m.date_match} | adversaire="${m.adversaire}" | domicile=${m.domicile} | verifie=${m.verifie} | calendrier_officiel_id=${m.calendrier_officiel_id}`);
}
