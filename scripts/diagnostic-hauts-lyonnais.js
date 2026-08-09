// Diagnostic (lecture seule) : vérifie la présence de Hauts Lyonnais en
// base et sa correspondance dans calendrier_officiel.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

const { data: joueurs, error: jErr } = await supabase.from('joueurs').select('id, prenom, nom, club, niveau').ilike('club', '%hauts%lyonnais%');
if (jErr) { console.error('Erreur lecture joueurs :', jErr.message); process.exit(1); }
console.log(`${joueurs.length} joueur(s) trouvé(s) avec club contenant "hauts lyonnais" :`);
for (const j of joueurs) console.log(`  ${j.prenom} ${j.nom} | club="${j.club}" | niveau="${j.niveau}"`);

const { data: matchs, error: mErr } = await supabase.from('calendrier_officiel').select('equipe_domicile, equipe_exterieur, division').or('equipe_domicile.ilike.%lyonnais%,equipe_exterieur.ilike.%lyonnais%');
if (mErr) { console.error('Erreur lecture calendrier_officiel :', mErr.message); process.exit(1); }
console.log(`\n${matchs.length} match(s) trouvé(s) avec "lyonnais" dans calendrier_officiel :`);
const clubs = new Set();
for (const m of matchs) { clubs.add(`${m.equipe_domicile} (division=${m.division})`); clubs.add(`${m.equipe_exterieur} (division=${m.division})`); }
for (const c of clubs) console.log(`  ${c}`);
