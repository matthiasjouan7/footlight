// Diagnostic lecture seule : Ahmed Majid (AS Cannes) est enregistré avec
// niveau="N1" alors qu'AS Cannes joue en Ligue 3 cette saison (confirmé par
// le calendrier VFC La Roche-sur-Yon : "2026-08-20 vs AS CANNES" est un
// match Ligue 3). Même schéma que la correction Amiens SC / VFC La
// Roche-sur-Yon (N1 -> Ligue 3) faite plus tôt cette session. Vérifie si
// d'autres joueurs "AS Cannes" ont le même niveau erroné avant de corriger.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const { data, error } = await supabase
  .from('joueurs')
  .select('id, prenom, nom, club, niveau, saison, matchs_joues')
  .ilike('club', '%cannes%')
  .eq('saison', '2026-2027');
if (error) { console.error('Erreur :', error.message); process.exit(1); }
console.log(`${data.length} joueur(s) "Cannes" (saison 2026-2027) :`);
for (const j of data) console.log(`  ${j.prenom} ${j.nom} — club="${j.club}" niveau="${j.niveau}" matchs_joues=${j.matchs_joues}`);

const { data: officiel, error: errO } = await supabase
  .from('calendrier_officiel')
  .select('division')
  .eq('saison', '2026-2027')
  .or('equipe_domicile.ilike.%cannes%,equipe_exterieur.ilike.%cannes%');
if (errO) { console.error('Erreur calendrier :', errO.message); process.exit(1); }
const divisions = [...new Set((officiel || []).map((r) => r.division))];
console.log(`\nDivision(s) officielle(s) trouvée(s) pour "Cannes" dans calendrier_officiel : ${divisions.join(', ') || '(aucune)'}`);
