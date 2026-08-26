// Le diagnostic précédent (diagnostic-doublon-3042.js) a montré que le
// doublon calendrier_officiel id=3042 ("Orléans vs La Roche-sur-Yon",
// 2026-08-27, créé par le bug connu de sync-lequipe-to-calendrier.js —
// nom court lequipe.fr, mauvaise date pour une journée à dates multiples)
// n'est PAS orphelin : 41 lignes matchs_joueur (joueurs des deux clubs,
// dont Kamil Bensoula) y sont déjà rattachées, en plus des 23 lignes déjà
// correctement rattachées au vrai match officiel id=1966 ("US ORLEANS vs
// VENDEE FC LA ROCHE/YON", 2026-08-29, journée 4). Contrairement au
// nettoyage N1 précédent (qui ne supprimait que des doublons SANS aucun
// joueur lié), il faut ici migrer les 41 lignes vers id=1966 avant de
// supprimer le doublon, pour ne perdre aucune donnée.
//
// Sécurité : vérifie qu'aucun joueur n'est déjà lié aux DEUX lignes
// (même joueur_id sur 1966 et 3042) avant de migrer quoi que ce soit —
// un conflit annulerait toute l'opération plutôt que d'écraser des
// données. DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const DOUBLON_ID = 3042;
const OFFICIEL_ID = 1966;

const { data: versDoublon, error: errD } = await supabase
  .from('matchs_joueur')
  .select('id, joueur_id')
  .eq('calendrier_officiel_id', DOUBLON_ID);
if (errD) { console.error('Erreur lecture doublon :', errD.message); process.exit(1); }

const { data: versOfficiel, error: errO } = await supabase
  .from('matchs_joueur')
  .select('id, joueur_id')
  .eq('calendrier_officiel_id', OFFICIEL_ID);
if (errO) { console.error('Erreur lecture officiel :', errO.message); process.exit(1); }

console.log(`${versDoublon.length} ligne(s) à migrer depuis le doublon id=${DOUBLON_ID} vers id=${OFFICIEL_ID} (qui a déjà ${versOfficiel.length} ligne(s)).`);

const joueursDejaOfficiel = new Set(versOfficiel.map((m) => m.joueur_id));
const conflits = versDoublon.filter((m) => joueursDejaOfficiel.has(m.joueur_id));
if (conflits.length) {
  console.error(`Erreur : ${conflits.length} joueur(s) déjà lié(s) aux DEUX lignes — migration annulée pour éviter toute perte : ${conflits.map((c) => c.joueur_id).join(', ')}`);
  process.exit(1);
}
console.log('Aucun conflit : les deux ensembles de joueurs sont bien disjoints.');

if (!dryRun) {
  const ids = versDoublon.map((m) => m.id);
  const { error: errMaj } = await supabase
    .from('matchs_joueur')
    .update({ calendrier_officiel_id: OFFICIEL_ID })
    .in('id', ids);
  if (errMaj) { console.error('Erreur migration matchs_joueur :', errMaj.message); process.exit(1); }
  console.log(`${ids.length} ligne(s) matchs_joueur migrée(s).`);

  const { error: errDel } = await supabase.from('calendrier_officiel').delete().eq('id', DOUBLON_ID);
  if (errDel) { console.error('Erreur suppression doublon :', errDel.message); process.exit(1); }
  console.log(`Ligne doublon id=${DOUBLON_ID} supprimée.`);
} else {
  console.log('\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour appliquer la migration et supprimer le doublon.');
}
