// Nettoyage ciblé du doublon calendrier créé pour Hyères / GFA RV
// (N1 groupe C, journée 4) avant l'ajout du synonyme "gfa rv" ->
// "rumilly vallieres" : calendrier_officiel_id=3503 ("Rumilly Vallières
// vs Hyères", 2026-09-11) est un doublon vide de calendrier_officiel_id=
// 2814 ("GFA RV vs HYERES F.C.", 2026-09-12), qui contient déjà les 24
// lignes matchs_joueur désormais synchronisées.
//
// Sécurité : vérifie qu'aucune ligne matchs_joueur ne référence le
// doublon (et n'a donc de stats) avant toute suppression. DRY_RUN=true
// par défaut.
import { createClient } from '@supabase/supabase-js';

const DRY_RUN = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

console.log(`Mode : ${DRY_RUN ? 'DRY_RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}\n`);

const ID_ORIGINAL = 2814;
const ID_DOUBLON = 3503;

const { data: rows, error } = await supabase
  .from('calendrier_officiel')
  .select('id, groupe, date_match, equipe_domicile, equipe_exterieur')
  .in('id', [ID_ORIGINAL, ID_DOUBLON]);
if (error) { console.error('Erreur lecture :', error.message); process.exit(1); }
const original = rows.find((r) => r.id === ID_ORIGINAL);
const doublon = rows.find((r) => r.id === ID_DOUBLON);
if (!original || !doublon) { console.log(`id=${ID_ORIGINAL} ou id=${ID_DOUBLON} introuvable (déjà traité ?), abandon.`); process.exit(0); }

console.log(`Original id=${original.id} "${original.equipe_domicile}" vs "${original.equipe_exterieur}" (${original.date_match})`);
console.log(`Doublon  id=${doublon.id} "${doublon.equipe_domicile}" vs "${doublon.equipe_exterieur}" (${doublon.date_match})`);

const { data: mjDoublon, error: errMj } = await supabase
  .from('matchs_joueur').select('id, joueur_id, minutes_jouees').eq('calendrier_officiel_id', ID_DOUBLON);
if (errMj) { console.error('Erreur lecture matchs_joueur :', errMj.message); process.exit(1); }
console.log(`\n${(mjDoublon || []).length} ligne(s) matchs_joueur référencent le doublon.`);
const avecStats = (mjDoublon || []).filter((m) => m.minutes_jouees != null);
if (avecStats.length) {
  console.log(`${avecStats.length} ligne(s) ont des stats déjà renseignées — abandon par sécurité (pas de fusion automatique).`);
  process.exit(0);
}

console.log(`\n${DRY_RUN ? 'À supprimer' : 'Suppression'} : calendrier_officiel id=${ID_DOUBLON}`);
if (!DRY_RUN) {
  const { data, error: errDel } = await supabase.from('calendrier_officiel').delete().eq('id', ID_DOUBLON).select('id');
  if (errDel) console.log(`  Erreur : ${errDel.message}`);
  else if (!data || !data.length) console.log('  ATTENTION : suppression sans effet.');
  else console.log('  Supprimé avec succès.');
}
if (DRY_RUN) console.log('\nDRY_RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
