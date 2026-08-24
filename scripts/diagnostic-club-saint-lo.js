// Diagnostic lecture seule : cherche le nom exact utilisé dans
// calendrier_officiel pour l'équipe FC Saint-Lô Manche (National 2), avant
// d'ajouter son effectif, pour choisir un nom de club qui se rapprochera
// correctement via clubWordsMatch (generer-calendriers-existants.js).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const { data, error } = await supabase
  .from('calendrier_officiel')
  .select('equipe_domicile, equipe_exterieur')
  .eq('division', 'N2')
  .eq('saison', '2026-2027')
  .or('equipe_domicile.ilike.%lo%manche%,equipe_exterieur.ilike.%lo%manche%,equipe_domicile.ilike.%saint-lo%,equipe_exterieur.ilike.%saint-lo%,equipe_domicile.ilike.%st lo%,equipe_exterieur.ilike.%st lo%');

if (error) { console.error('Erreur lecture calendrier_officiel :', error.message); process.exit(1); }

const noms = new Set();
for (const m of data || []) {
  noms.add(m.equipe_domicile);
  noms.add(m.equipe_exterieur);
}
console.log(`${data?.length || 0} match(s) trouvé(s).`);
console.log('Nom(s) distinct(s) :', [...noms].filter(Boolean).join(' | ') || '(aucun)');

// Vérifie aussi l'état actuel des joueurs existants pour ce club (déjà
// signalé comme "effectif quasi vide" lors d'un diagnostic précédent).
const { data: joueurs, error: errJ } = await supabase
  .from('joueurs')
  .select('id, prenom, nom, club')
  .ilike('club', '%saint-l%manche%');
if (errJ) { console.error('Erreur lecture joueurs :', errJ.message); process.exit(1); }
console.log(`\n${joueurs?.length || 0} joueur(s) existant(s) avec un club contenant "saint-l...manche" :`);
(joueurs || []).forEach(j => console.log(`  ${j.prenom} ${j.nom} (id=${j.id}, club="${j.club}")`));
