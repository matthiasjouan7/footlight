// Nettoie le NOUVEAU doublon calendrier créé par erreur lors du renommage
// "Lorient B" → "FC LORIENT 2" (uniformiser-nom-lorient-b.js) : la ligne
// id=2789 (renommée, 21/08/2026, créée le 23/08) fait doublon avec la ligne
// id=245 (calendrier officiel complet FC LORIENT 2, 22/08/2026, créée le
// 24/07 — largement antérieure, donc conservée comme référence).
// Le script de renommage ne comparait que les dates EXACTES et n'a donc
// pas détecté ce conflit à un jour d'écart (21/08 vs 22/08).
//
// Étapes (identiques au nettoyage précédent, cible différente) :
//  1. Pour les joueurs présents uniquement sous 2789 (pas sous 245) :
//     rattache leur ligne matchs_joueur à 245 au lieu de la supprimer.
//  2. Pour les joueurs présents sous les DEUX lignes : supprime la ligne
//     matchs_joueur dupliquée rattachée à 2789 (garde celle de 245).
//  3. Une fois 2789 sans plus aucun matchs_joueur lié, supprime la ligne
//     calendrier_officiel id=2789.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const ID_A_DOUBLON = 2789; // ligne à vider puis supprimer (renommée par erreur, 21/08)
const ID_B_REFERENCE = 245; // ligne conservée (calendrier officiel original, 22/08)

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
