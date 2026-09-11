// Nettoyage ciblé des 12 doublons calendrier_officiel N2 restants après
// nettoie-doublons-calendrier-n2-lequipe.js (qui a traité 22+2=24 des 36
// doublons connus via rapprochement automatique). Ces 12 derniers ont des
// variations orthographiques trop spécifiques pour justifier une règle
// générique dans le moteur de rapprochement partagé avec le cron quotidien
// (risque de collision avec des cas déjà protégés, ex: "APM Metz"/"Metz"
// volontairement distincts) : "Fontenay Vendée"/"Fontenay-le-Comte",
// "Stade Rennais FC B"/"Rennes B", "As Ptt Caen"/"ASPTT Caen", "Metz Apm
// Fc"/"Metz Municipaux", "Sbfc"/"Beaucaire", "Et.S. Fosseenne"/"Fos-sur-
// Mer" — identifiés manuellement via diagnostic-n2-matchs-non-synchronises.js
// et diagnostic-nouveaux-doublons-calendrier.js (tous créés fin août-début
// septembre, avant le correctif du 10/09, donc pas une régression).
//
// Traite une liste explicite de paires (id à garder, id à supprimer)
// plutôt qu'un rapprochement automatique : vérifie que le doublon n'a
// aucune ligne matchs_joueur avec des stats avant de le supprimer.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const DRY_RUN = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

console.log(`Mode : ${DRY_RUN ? 'DRY_RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}\n`);

const PAIRES = [
  { original: 675, doublon: 3340 },   // Panazol As 1 / Fontenay Vendee 1 <-> Panazol / Fontenay-le-Comte
  { original: 687, doublon: 3453 },   // Challans Fc 1 / Fontenay Vendee 1 <-> Challans / Fontenay-le-Comte
  { original: 855, doublon: 3346 },   // OC Cesson-Sévigné / As Ptt Caen 1 <-> Cesson / ASPTT Caen
  { original: 857, doublon: 3351 },   // Vannes Oc 1 / Stade Rennais FC B <-> Vannes / Rennes B
  { original: 869, doublon: 3463 },   // Fc St Lo Manche 1 / Stade Rennais FC B <-> Saint-Lô / Rennes B
  { original: 863, doublon: 3466 },   // As Ptt Caen 1 / Af Virois 1 <-> ASPTT Caen / Vire
  { original: 1209, doublon: 3370 },  // Ja Drancy 1 / Metz Apm Fc 1 <-> Drancy / Metz Municipaux
  { original: 1231, doublon: 3459 },  // Metz Apm Fc 1 / Us Ivry Football 1 <-> Metz Municipaux / Ivry
  { original: 1575, doublon: 3374 },  // Fc Rousset Ste Vict. 1 / Sbfc 1 <-> Rousset / Beaucaire
  { original: 1579, doublon: 3375 },  // Us Mandelieu Ln 1 / Et.S. Fosseenne 1 <-> Mandelieu / Fos-sur-Mer
  { original: 1595, doublon: 3446 },  // Sbfc 1 / Montpellier Hsc 2 <-> Beaucaire / Montpellier B
  { original: 1587, doublon: 3449 },  // Et.S. Fosseenne 1 / Gallia C. Lucciana 1 <-> Fos-sur-Mer / Gallia Lucciana
];

let totalSupprimees = 0, totalIgnorees = 0, totalMjRattachees = 0;
for (const { original: idOriginal, doublon: idDoublon } of PAIRES) {
  const { data: rows, error } = await supabase
    .from('calendrier_officiel')
    .select('id, groupe, date_match, equipe_domicile, equipe_exterieur')
    .in('id', [idOriginal, idDoublon]);
  if (error) { console.error(`Erreur lecture ${idOriginal}/${idDoublon} :`, error.message); continue; }
  const original = rows.find((r) => r.id === idOriginal);
  const doublon = rows.find((r) => r.id === idDoublon);
  if (!original || !doublon) { console.log(`  id=${idOriginal} ou id=${idDoublon} introuvable (déjà traité ?), ignoré.`); continue; }

  const { data: mjDoublon, error: errMj } = await supabase.from('matchs_joueur').select('id, joueur_id, minutes_jouees').eq('calendrier_officiel_id', idDoublon);
  if (errMj) { console.error(`Erreur lecture matchs_joueur pour id=${idDoublon} :`, errMj.message); continue; }
  const avecStats = (mjDoublon || []).filter((m) => m.minutes_jouees != null);
  if (avecStats.length) {
    console.log(`  id=${idDoublon} a ${avecStats.length} ligne(s) matchs_joueur avec des stats — ignoré par sécurité.`);
    totalIgnorees++;
    continue;
  }

  console.log(`Original id=${original.id} "${original.equipe_domicile}" vs "${original.equipe_exterieur}" (${original.date_match}) <-> doublon id=${doublon.id} "${doublon.equipe_domicile}" vs "${doublon.equipe_exterieur}" (${doublon.date_match}, ${(mjDoublon || []).length} ligne(s) matchs_joueur vide(s))`);

  const { data: mjOriginal } = await supabase.from('matchs_joueur').select('joueur_id').eq('calendrier_officiel_id', idOriginal);
  for (const m of mjDoublon || []) {
    const dejaCoteOriginal = (mjOriginal || []).some((mo) => mo.joueur_id === m.joueur_id);
    if (dejaCoteOriginal) {
      console.log(`  joueur_id=${m.joueur_id} : déjà une ligne côté original, ${DRY_RUN ? 'à supprimer' : 'suppression'} du doublon matchs_joueur id=${m.id}`);
      if (!DRY_RUN) {
        const { error: errDel } = await supabase.from('matchs_joueur').delete().eq('id', m.id);
        if (errDel) console.log(`    Erreur : ${errDel.message}`);
      }
    } else {
      console.log(`  joueur_id=${m.joueur_id} : ${DRY_RUN ? 'à rattacher' : 'rattachement'} vers calendrier_officiel_id=${idOriginal}`);
      totalMjRattachees++;
      if (!DRY_RUN) {
        const { error: errUpd } = await supabase.from('matchs_joueur').update({ calendrier_officiel_id: idOriginal }).eq('id', m.id);
        if (errUpd) console.log(`    Erreur : ${errUpd.message}`);
      }
    }
  }

  console.log(`  ${DRY_RUN ? 'À supprimer' : 'Suppression'} : calendrier_officiel id=${idDoublon}`);
  totalSupprimees++;
  if (!DRY_RUN) {
    const { data, error: errDelCal } = await supabase.from('calendrier_officiel').delete().eq('id', idDoublon).select('id');
    if (errDelCal) console.log(`    Erreur : ${errDelCal.message}`);
    else if (!data || !data.length) console.log(`    ATTENTION : suppression sans effet pour id=${idDoublon}`);
  }
  console.log('');
}

console.log(`\n========== Résumé ==========`);
console.log(`${totalSupprimees} ligne(s) calendrier_officiel doublon ${DRY_RUN ? 'à supprimer' : 'supprimée(s)'}, ${totalMjRattachees} ligne(s) matchs_joueur ${DRY_RUN ? 'à rattacher' : 'rattachée(s)'}, ${totalIgnorees} paire(s) ignorée(s) par sécurité.`);
if (DRY_RUN) console.log('DRY_RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
