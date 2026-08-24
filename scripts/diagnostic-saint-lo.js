// Diagnostic lecture seule : détail de l'unique joueur enregistré pour
// FC St Lô Manche (N2 groupe C), effectif quasi vide.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const { data, error } = await supabase
  .from('joueurs')
  .select('id, prenom, nom, club, niveau, saison, poste, profil_public')
  .ilike('club', '%st lo%');
if (error) { console.error(error.message); process.exit(1); }
console.log(`Joueurs "St Lo" : ${data.length}`);
for (const j of data) console.log(`  id=${j.id} — ${j.prenom} ${j.nom} — club="${j.club}" niveau=${j.niveau} saison=${j.saison} poste=${j.poste} profil_public=${j.profil_public}`);

const { data: cal, error: e2 } = await supabase
  .from('calendrier_officiel')
  .select('equipe_domicile, equipe_exterieur, date_match, journee')
  .eq('division', 'N2').eq('groupe', 'C').eq('saison', '2026-2027')
  .or('equipe_domicile.ilike.%st lo%,equipe_exterieur.ilike.%st lo%')
  .order('date_match', { ascending: true })
  .limit(3);
if (e2) { console.error(e2.message); process.exit(1); }
console.log(`\nPremiers matchs calendrier :`);
for (const r of cal) console.log(`  J${r.journee} — ${r.date_match} — ${r.equipe_domicile} vs ${r.equipe_exterieur}`);
