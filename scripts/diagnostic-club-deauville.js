// Diagnostic lecture seule : cherche les joueurs existants dont le club
// contient "deauville" ou "astdv" (National 2, groupe D signalé "Astdv 1"
// dans calendrier_officiel, sans effectif détecté par
// diagnostic-effectifs-manquants-n2.js) pour comprendre pourquoi le
// rapprochement clubWordsMatch (generer-calendriers-existants.js) ne les
// a pas trouvés.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const { data, error } = await supabase
  .from('joueurs')
  .select('id, prenom, nom, club, niveau, saison')
  .or('club.ilike.%deauville%,club.ilike.%astdv%,club.ilike.%trouville%');

if (error) { console.error('Erreur lecture joueurs :', error.message); process.exit(1); }

console.log(`${data?.length || 0} joueur(s) trouvé(s) avec un club contenant "deauville"/"astdv"/"trouville" :`);
(data || []).forEach(j => console.log(`  ${j.prenom} ${j.nom} (id=${j.id}, club="${j.club}", niveau=${j.niveau}, saison=${j.saison})`));

// Vérifie aussi l'entrée exacte du calendrier pour "Astdv"
const { data: cal, error: errCal } = await supabase
  .from('calendrier_officiel')
  .select('equipe_domicile, equipe_exterieur, groupe')
  .eq('division', 'N2')
  .eq('saison', '2026-2027')
  .or('equipe_domicile.ilike.%astdv%,equipe_exterieur.ilike.%astdv%');
if (errCal) { console.error('Erreur lecture calendrier :', errCal.message); process.exit(1); }
const noms = new Set();
(cal || []).forEach(m => { noms.add(m.equipe_domicile); noms.add(m.equipe_exterieur); });
console.log(`\nNom(s) exact(s) "Astdv" dans calendrier_officiel :`, [...noms].filter(Boolean).join(' | ') || '(aucun)');
