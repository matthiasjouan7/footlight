// Le diagnostic du doublon calendrier_officiel id=3042 (VFC La Roche-sur-Yon,
// créé par le bug connu de sync-lequipe-to-calendrier.js) a montré que 41
// lignes matchs_joueur y sont rattachées à tort, dont 20 pour des joueurs
// qui ont AUSSI déjà une ligne sur le vrai match officiel id=1966 (double
// ligne pour le même match réel, risque de double comptage). Pour ces 20 :
// garde la ligne avec le plus de champs de stats renseignés (à égalité,
// garde celle du match officiel) et supprime l'autre. Pour les 21 restants
// (aucun conflit) : migre simplement leur ligne vers id=1966. Termine en
// supprimant la ligne doublon id=3042 (désormais vide).
//
// DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const DOUBLON_ID = 3042;
const OFFICIEL_ID = 1966;
const CHAMPS_STATS = ['score_pour', 'score_contre', 'buts', 'passes_decisives', 'cartons_jaunes', 'cartons_rouges', 'minutes_jouees'];
const nbRenseignes = (row) => CHAMPS_STATS.filter((c) => row[c] !== null && row[c] !== undefined).length;

const { data: versDoublon, error: errD } = await supabase.from('matchs_joueur').select('*').eq('calendrier_officiel_id', DOUBLON_ID);
if (errD) { console.error('Erreur lecture doublon :', errD.message); process.exit(1); }
const { data: versOfficiel, error: errO } = await supabase.from('matchs_joueur').select('*').eq('calendrier_officiel_id', OFFICIEL_ID);
if (errO) { console.error('Erreur lecture officiel :', errO.message); process.exit(1); }

const parJoueurOfficiel = new Map(versOfficiel.map((m) => [m.joueur_id, m]));
const conflits = versDoublon.filter((m) => parJoueurOfficiel.has(m.joueur_id));
const sansConflit = versDoublon.filter((m) => !parJoueurOfficiel.has(m.joueur_id));
console.log(`${versDoublon.length} ligne(s) sur le doublon : ${sansConflit.length} à migrer sans conflit, ${conflits.length} en double avec l'officiel (id=${OFFICIEL_ID}).`);

let aSupprimer = [];
for (const d of conflits) {
  const o = parJoueurOfficiel.get(d.joueur_id);
  const garderOfficiel = nbRenseignes(o) >= nbRenseignes(d);
  const garde = garderOfficiel ? o : d;
  const supprime = garderOfficiel ? d : o;
  console.log(`  joueur_id=${d.joueur_id} : garde ligne id=${garde.id} (${nbRenseignes(garde)} champ(s) renseigné(s)), supprime id=${supprime.id} (${nbRenseignes(supprime)} champ(s))`);
  aSupprimer.push(supprime.id);
}

if (!dryRun) {
  if (aSupprimer.length) {
    const { error: errDelConf } = await supabase.from('matchs_joueur').delete().in('id', aSupprimer);
    if (errDelConf) { console.error('Erreur suppression conflits :', errDelConf.message); process.exit(1); }
    console.log(`${aSupprimer.length} ligne(s) en double supprimée(s).`);
  }
  if (sansConflit.length) {
    const { error: errMaj } = await supabase.from('matchs_joueur').update({ calendrier_officiel_id: OFFICIEL_ID }).in('id', sansConflit.map((m) => m.id));
    if (errMaj) { console.error('Erreur migration matchs_joueur :', errMaj.message); process.exit(1); }
    console.log(`${sansConflit.length} ligne(s) migrée(s) vers id=${OFFICIEL_ID}.`);
  }
  const { error: errDel } = await supabase.from('calendrier_officiel').delete().eq('id', DOUBLON_ID);
  if (errDel) { console.error('Erreur suppression doublon :', errDel.message); process.exit(1); }
  console.log(`Ligne doublon id=${DOUBLON_ID} supprimée.`);
} else {
  console.log(`\nDRY RUN : ${aSupprimer.length} suppression(s) de doublon-conflit + ${sansConflit.length} migration(s) + suppression de la ligne id=${DOUBLON_ID} à faire. Relancer avec DRY_RUN=false pour appliquer.`);
}
