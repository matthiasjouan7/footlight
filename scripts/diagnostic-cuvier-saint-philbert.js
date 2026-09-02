// Diagnostic lecture seule : l'utilisateur signale un match Saint-Philbert
// déjà joué et gagné 3-0, avec un joueur "Cuvier" auteur des 3 buts — ce
// qui contredit le diagnostic précédent (aucun calendrier_officiel trouvé
// avec une date passée pour "philbert"/"philibert"). Cherche le joueur
// Cuvier et TOUTES les lignes calendrier contenant "philbert"/"philibert"
// (sans filtre de date ni de division) pour voir ce qui a été raté.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const { data: cuvier, error: errC } = await supabase
  .from('joueurs')
  .select('id, prenom, nom, club, niveau, saison, matchs_joues, buts')
  .ilike('nom', '%cuvier%');
if (errC) { console.error('Erreur joueur Cuvier :', errC.message); process.exit(1); }
console.log(`${cuvier.length} joueur(s) "Cuvier" :`);
for (const j of cuvier) console.log(`  ${j.prenom} ${j.nom} — club="${j.club}" — niveau=${j.niveau} — saison=${j.saison} — matchs_joues=${j.matchs_joues} — buts=${j.buts}`);
for (const j of cuvier) {
  const { data: mj } = await supabase.from('matchs_joueur').select('id, date_match, adversaire, score_pour, score_contre, minutes_jouees, buts, calendrier_officiel_id').eq('joueur_id', j.id).order('date_match');
  console.log(`\n  matchs_joueur de ${j.prenom} ${j.nom} (id=${j.id}) : ${mj ? mj.length : 0}`);
  for (const m of mj || []) console.log(`    date=${m.date_match} adversaire="${m.adversaire}" score=${m.score_pour}-${m.score_contre} buts=${m.buts} minutes=${m.minutes_jouees} calendrier_officiel_id=${m.calendrier_officiel_id}`);
}

console.log('\n########## Toutes les lignes calendrier_officiel "philbert"/"philibert" (sans filtre date/division) ##########');
const { data: cal, error: errCal } = await supabase
  .from('calendrier_officiel')
  .select('id, division, groupe, saison, equipe_domicile, equipe_exterieur, date_match')
  .or('equipe_domicile.ilike.%philbert%,equipe_exterieur.ilike.%philbert%,equipe_domicile.ilike.%philibert%,equipe_exterieur.ilike.%philibert%')
  .order('date_match');
if (errCal) { console.error('Erreur calendrier :', errCal.message); process.exit(1); }
console.log(`${cal.length} ligne(s) :`);
for (const c of cal) console.log(`  id=${c.id} — ${c.division} — groupe ${c.groupe} — saison ${c.saison} — ${c.date_match} — "${c.equipe_domicile}" vs "${c.equipe_exterieur}"`);

console.log('\n########## Recherche large "cuvier" dans matchs_joueur.adversaire (au cas où) ##########');
const { data: mjCuvier } = await supabase.from('matchs_joueur').select('id, joueur_id, date_match, adversaire, score_pour, score_contre').ilike('adversaire', '%cuvier%');
console.log(`${mjCuvier ? mjCuvier.length : 0} ligne(s).`);
