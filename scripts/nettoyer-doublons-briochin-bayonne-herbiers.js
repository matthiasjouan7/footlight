// Nettoie les doublons calendrier confirmés par
// detail-orphelines-briochin-bayonne-herbiers.js : des lignes orphelines au
// nom raccourci ("Saint-Brieuc", "Bayonne", "Les Herbiers") dupliquent le
// même match que les lignes officielles complètes ("Stade Briochin",
// "Aviron Bayonnais FC", "LES HERBIERS VF"), causant une ambiguïté qui
// bloque generer-calendriers-existants.js pour TOUS les joueurs de ces
// trois clubs.
//
// Pour chaque groupe (lignes orphelines → ligne de référence conservée) :
//  1. Pour chaque joueur présent uniquement sous une ligne orpheline (pas
//     sous la référence, ni déjà migré depuis une autre orpheline du même
//     groupe) : rattache sa ligne matchs_joueur à la référence.
//  2. Pour les autres (déjà présents sous la référence, ou doublon entre
//     deux orphelines) : supprime la ligne matchs_joueur dupliquée.
//  3. Une fois toutes les lignes orphelines du groupe vidées, les supprime.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const GROUPES = [
  { nom: 'Saint-Brieuc → Stade Briochin', orphelines: [2781, 2791], reference: 243 },
  { nom: 'Bayonne → Aviron Bayonnais FC', orphelines: [2783, 2784], reference: 247 },
  { nom: 'Les Herbiers → LES HERBIERS VF', orphelines: [2788], reference: 244 },
];

let totalRattaches = 0, totalSupprimes = 0, totalLignesCal = 0;

for (const { nom, orphelines, reference } of GROUPES) {
  console.log(`\n=== ${nom} ===`);
  const tousIds = [...orphelines, reference];
  const { data: matchs, error } = await supabase
    .from('matchs_joueur')
    .select('id, joueur_id, calendrier_officiel_id')
    .in('calendrier_officiel_id', tousIds);
  if (error) { console.error('Erreur lecture matchs_joueur :', error.message); process.exit(1); }

  const parLigne = new Map(tousIds.map((id) => [id, matchs.filter((m) => m.calendrier_officiel_id === id)]));
  console.log(`  Référence id=${reference} : ${parLigne.get(reference).length} matchs_joueur (inchangée).`);

  const joueursDejaVus = new Set(parLigne.get(reference).map((m) => m.joueur_id));

  for (const idOrph of orphelines) {
    const lignes = parLigne.get(idOrph);
    console.log(`  Orpheline id=${idOrph} : ${lignes.length} matchs_joueur.`);
    for (const m of lignes) {
      if (joueursDejaVus.has(m.joueur_id)) {
        console.log(`    ${dryRun ? 'À supprimer' : 'Suppression'} : matchs_joueur id=${m.id} (joueur_id=${m.joueur_id}, doublon)`);
        totalSupprimes++;
        if (!dryRun) {
          const { error: delErr } = await supabase.from('matchs_joueur').delete().eq('id', m.id);
          if (delErr) console.log(`      Erreur suppression : ${delErr.message}`);
        }
      } else {
        joueursDejaVus.add(m.joueur_id);
        console.log(`    ${dryRun ? 'À rattacher' : 'Rattachement'} : matchs_joueur id=${m.id} (joueur_id=${m.joueur_id}) → calendrier_officiel_id=${reference}`);
        totalRattaches++;
        if (!dryRun) {
          const { error: updErr } = await supabase.from('matchs_joueur').update({ calendrier_officiel_id: reference }).eq('id', m.id);
          if (updErr) console.log(`      Erreur rattachement : ${updErr.message}`);
        }
      }
    }
  }

  for (const idOrph of orphelines) {
    console.log(`  ${dryRun ? 'À supprimer' : 'Suppression'} : ligne calendrier_officiel id=${idOrph} (devenue vide).`);
    totalLignesCal++;
    if (!dryRun) {
      const { error: delCalErr } = await supabase.from('calendrier_officiel').delete().eq('id', idOrph);
      if (delCalErr) console.log(`    Erreur suppression : ${delCalErr.message}`);
    }
  }
}

console.log(`\nRésumé global : ${totalRattaches} rattachement(s), ${totalSupprimes} suppression(s) matchs_joueur, ${totalLignesCal} ligne(s) calendrier à supprimer.`);
if (dryRun) console.log('DRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
