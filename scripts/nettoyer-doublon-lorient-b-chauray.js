// Nettoie le doublon calendrier "Lorient B vs FC Chauray" confirmé par
// analyse-doublon-lorient-b.js : les lignes calendrier_officiel id=2759
// (22/08/2026, créée le 02/08) et id=2789 (21/08/2026, créée le 23/08)
// représentent le MÊME match, avec 29 des 30 joueurs FC Chauray comptés en
// double (une entrée matchs_joueur sous chaque ligne).
//
// Étapes :
//  1. Pour le seul joueur présent uniquement sous 2759 (pas sous 2789) :
//     rattache sa ligne matchs_joueur à 2789 au lieu de la supprimer, pour
//     ne pas perdre sa participation au match.
//  2. Pour les 29 joueurs présents sous les DEUX lignes : supprime la ligne
//     matchs_joueur dupliquée rattachée à 2759 (garde celle de 2789).
//  3. Une fois 2759 sans plus aucun matchs_joueur lié, supprime la ligne
//     calendrier_officiel id=2759 (garde 2789 comme référence).
//
// Sécurité : DRY_RUN=true par défaut. Ne touche à aucun autre club/joueur.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const ID_A_DOUBLON = 2759; // ligne à vider puis supprimer
const ID_B_REFERENCE = 2789; // ligne conservée

const { data: matchs, error } = await supabase
  .from('matchs_joueur')
  .select('id, joueur_id, calendrier_officiel_id')
  .in('calendrier_officiel_id', [ID_A_DOUBLON, ID_B_REFERENCE]);
if (error) { console.error('Erreur lecture matchs_joueur :', error.message); process.exit(1); }

const parLigne = { [ID_A_DOUBLON]: [], [ID_B_REFERENCE]: [] };
for (const m of matchs) parLigne[m.calendrier_officiel_id].push(m);

const joueursB = new Set(parLigne[ID_B_REFERENCE].map((m) => m.joueur_id));

const aReattacher = parLigne[ID_A_DOUBLON].filter((m) => !joueursB.has(m.joueur_id));
const aSupprimer = parLigne[ID_A_DOUBLON].filter((m) => joueursB.has(m.joueur_id));

console.log(`Ligne ${ID_A_DOUBLON} : ${parLigne[ID_A_DOUBLON].length} matchs_joueur (${aReattacher.length} à rattacher à ${ID_B_REFERENCE}, ${aSupprimer.length} doublons à supprimer).`);
console.log(`Ligne ${ID_B_REFERENCE} (référence conservée) : ${parLigne[ID_B_REFERENCE].length} matchs_joueur, inchangée.`);

for (const m of aReattacher) {
  console.log(`${dryRun ? 'À rattacher' : 'Rattachement'} : matchs_joueur id=${m.id} (joueur_id=${m.joueur_id}) → calendrier_officiel_id=${ID_B_REFERENCE}`);
  if (!dryRun) {
    const { error: updErr } = await supabase.from('matchs_joueur').update({ calendrier_officiel_id: ID_B_REFERENCE }).eq('id', m.id);
    if (updErr) console.log(`  Erreur rattachement : ${updErr.message}`);
  }
}

for (const m of aSupprimer) {
  console.log(`${dryRun ? 'À supprimer' : 'Suppression'} : matchs_joueur id=${m.id} (joueur_id=${m.joueur_id}, doublon)`);
  if (!dryRun) {
    const { error: delErr } = await supabase.from('matchs_joueur').delete().eq('id', m.id);
    if (delErr) console.log(`  Erreur suppression : ${delErr.message}`);
  }
}

console.log(`${dryRun ? 'À supprimer' : 'Suppression'} : ligne calendrier_officiel id=${ID_A_DOUBLON} (devenue vide).`);
if (!dryRun) {
  const { error: delCalErr } = await supabase.from('calendrier_officiel').delete().eq('id', ID_A_DOUBLON);
  if (delCalErr) console.log(`  Erreur suppression : ${delCalErr.message}`);
}

console.log(`\nRésumé : ${aReattacher.length} rattachement(s), ${aSupprimer.length} suppression(s) matchs_joueur, 1 ligne calendrier à supprimer.`);
if (dryRun) console.log('DRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
