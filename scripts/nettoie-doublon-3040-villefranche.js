// Nettoie le doublon calendrier_officiel id=3040 ("Villefranche
// Beaujolais vs Rouen", noms informels, 27/08) confirmé par
// diagnostic-doublon-3040.js : les 20 lignes matchs_joueur qui y sont
// liées sont TOUTES des joueurs de FC Villefranche Beaujolais (aucun
// joueur de Rouen), et sont des doublons exacts du vrai match id=1972
// ("FC VILLEFRANCHE BEAUJOLAIS vs FC ROUEN 1899", noms officiels, 29/08,
// où les 20 mêmes joueurs Villefranche + les 20 joueurs Rouen sont déjà
// correctement présents). Supprime les 20 lignes matchs_joueur liées à
// id=3040 puis la ligne calendrier_officiel id=3040 elle-même (plus rien
// n'y est rattaché après nettoyage).
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const ID_DOUBLON = 3040;

const { data: liens, error: errL } = await supabase.from('matchs_joueur').select('id, joueur_id').eq('calendrier_officiel_id', ID_DOUBLON);
if (errL) { console.error('Erreur :', errL.message); process.exit(1); }
console.log(`${liens.length} ligne(s) matchs_joueur liée(s) à calendrier_officiel id=${ID_DOUBLON}.`);

if (!dryRun && liens.length) {
  const { error: delMErr } = await supabase.from('matchs_joueur').delete().in('id', liens.map((m) => m.id));
  if (delMErr) { console.error('Erreur suppression matchs_joueur :', delMErr.message); process.exit(1); }
  console.log(`  ${liens.length} ligne(s) matchs_joueur supprimée(s).`);
} else if (dryRun) {
  console.log(`  (DRY RUN) ${liens.length} ligne(s) matchs_joueur à supprimer.`);
}

if (!dryRun) {
  const { error: delCErr } = await supabase.from('calendrier_officiel').delete().eq('id', ID_DOUBLON);
  if (delCErr) { console.error('Erreur suppression calendrier_officiel :', delCErr.message); process.exit(1); }
  console.log(`  Ligne calendrier_officiel id=${ID_DOUBLON} supprimée.`);
} else {
  console.log(`  (DRY RUN) Ligne calendrier_officiel id=${ID_DOUBLON} à supprimer.`);
}

if (dryRun) console.log('\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
