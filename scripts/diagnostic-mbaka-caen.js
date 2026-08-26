// Diagnostic lecture seule : l'utilisateur signale un joueur "M'Baka" à
// Caen (SM Caen, adversaire confirmé de VFC La Roche-sur-Yon en Ligue 3
// cette saison, voir le calendrier de Kamil Bensoula). Vérifie sa fiche
// (niveau/club/saison/stats/calendrier) pour détecter le même type de bug
// que Majid/Gassama (niveau erroné empêchant tout calendrier/stats).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const { data, error } = await supabase.from('joueurs').select('*').or('nom.ilike.%baka%,nom.ilike.%mbaka%');
if (error) { console.error('Erreur :', error.message); process.exit(1); }
console.log(`${data.length} fiche(s) "baka" trouvée(s) :`);
for (const j of data) {
  console.log(`\nid=${j.id}`);
  console.log(`  ${j.prenom} ${j.nom} — club="${j.club}" niveau="${j.niveau}" saison="${j.saison}"`);
  console.log(`  matchs_joues=${j.matchs_joues} buts=${j.buts} profil_public=${j.profil_public}`);
  const { data: mj } = await supabase.from('matchs_joueur').select('id').eq('joueur_id', j.id);
  console.log(`  ${mj?.length || 0} ligne(s) matchs_joueur.`);
}

const { data: officiel } = await supabase
  .from('calendrier_officiel')
  .select('division')
  .eq('saison', '2026-2027')
  .or('equipe_domicile.ilike.%caen%,equipe_exterieur.ilike.%caen%');
const divisions = [...new Set((officiel || []).map((r) => r.division))];
console.log(`\nDivision(s) officielle(s) trouvée(s) pour "Caen" dans calendrier_officiel : ${divisions.join(', ') || '(aucune)'}`);
