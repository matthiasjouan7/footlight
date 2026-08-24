// Diagnostic lecture seule : trouve le nom exact du club FC Balagne dans
// calendrier_officiel (National 2, saison 2026-2027), avant de créer le
// script d'ajout d'effectif.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const { data, error } = await supabase
  .from('calendrier_officiel')
  .select('equipe_domicile, equipe_exterieur')
  .eq('division', 'N2')
  .eq('saison', '2026-2027');
if (error) { console.error('Erreur lecture calendrier_officiel :', error.message); process.exit(1); }

const noms = new Set();
for (const m of data || []) {
  noms.add(m.equipe_domicile);
  noms.add(m.equipe_exterieur);
}
const candidats = [...noms].filter((n) => (n || '').toLowerCase().includes('balagne'));
console.log(`Candidat(s) contenant "balagne" : ${candidats.length}`);
for (const c of candidats) console.log(`  "${c}"`);

const { data: joueurs, error: errJ } = await supabase
  .from('joueurs')
  .select('id, prenom, nom, club')
  .ilike('club', '%balagne%');
if (errJ) { console.error('Erreur lecture joueurs :', errJ.message); process.exit(1); }
console.log(`\nJoueur(s) déjà en base avec club contenant "balagne" : ${joueurs?.length || 0}`);
for (const j of joueurs || []) console.log(`  ${j.prenom} ${j.nom} (club="${j.club}", id=${j.id})`);
