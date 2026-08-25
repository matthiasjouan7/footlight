// Diagnostic lecture seule : l'utilisateur signale que les profils
// "Daury", "Haribou" et "Hari" apparaissent vides. Recherche large par
// nom (prénom OU nom de famille, insensible à la casse) pour retrouver
// tous les joueurs correspondants, et vérifie pour chacun : le club,
// matchs_joues agrégé, le nombre réel de lignes matchs_joueur, et
// profil_public (qui pourrait expliquer un profil qui semble "vide" côté
// recruteur).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const TERMES = ['daury', 'haribou', 'hari'];

for (const terme of TERMES) {
  const { data: joueurs, error } = await supabase
    .from('joueurs')
    .select('id, prenom, nom, club, niveau, saison, matchs_joues, buts, profil_public, badge, email')
    .or(`prenom.ilike.%${terme}%,nom.ilike.%${terme}%`);
  if (error) { console.error(`Erreur pour "${terme}" :`, error.message); continue; }
  console.log(`\n=== Recherche "${terme}" : ${joueurs.length} joueur(s) ===`);
  for (const j of joueurs) {
    const { count } = await supabase
      .from('matchs_joueur')
      .select('id', { count: 'exact', head: true })
      .eq('joueur_id', j.id);
    console.log(`  ${j.prenom} ${j.nom} (id=${j.id}) — club="${j.club}" niveau=${j.niveau} saison=${j.saison} | matchs_joues(agrégé)=${j.matchs_joues} buts=${j.buts} | matchs_joueur en base=${count} | profil_public=${j.profil_public} badge=${j.badge} | email=${j.email}`);
  }
}
