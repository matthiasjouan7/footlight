// Diagnostic lecture seule : l'utilisateur signale que "Majid" est bien
// inscrit sur FootLight (contrairement à ce qu'a rapporté
// diagnostic-passeurs-non-inscrits.js, qui n'a trouvé aucune correspondance
// pour "A. Majid" en niveau=Ligue 3 saison=2026-2027) mais sans aucune stat
// renseignée. Cherche toute fiche "Majid" en base, quel que soit le niveau/
// la saison, pour comprendre l'écart (mauvais niveau ? saison différente ?
// prénom qui ne commence pas par "A" ? club jamais généré ?).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const { data, error } = await supabase.from('joueurs').select('*').ilike('nom', '%majid%');
if (error) { console.error('Erreur :', error.message); process.exit(1); }
console.log(`${data.length} fiche(s) "Majid" trouvée(s) :`);
for (const j of data) {
  console.log(`\nid=${j.id}`);
  console.log(`  ${j.prenom} ${j.nom} — club="${j.club}" niveau="${j.niveau}" saison="${j.saison}"`);
  console.log(`  matchs_joues=${j.matchs_joues} buts=${j.buts} passes_decisives=${j.passes_decisives} profil_public=${j.profil_public}`);
}

if (data.length) {
  for (const j of data) {
    const { data: mj } = await supabase.from('matchs_joueur').select('id, date_match, calendrier_officiel_id, score_pour, score_contre').eq('joueur_id', j.id);
    console.log(`\n${j.prenom} ${j.nom} : ${mj?.length || 0} ligne(s) matchs_joueur.`);
  }
}
