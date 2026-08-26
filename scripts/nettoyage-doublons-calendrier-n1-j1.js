// Nettoyage : les diagnostics précédents ont montré que N1 groupes B et C,
// journée 1, contiennent chacun une série de lignes calendrier_officiel
// dupliquées datées du 21/08 (créées par le bug connu et non corrigé de
// sync-lequipe-to-calendrier.js — noms d'usage lequipe.fr sans mot commun
// avec le nom officiel, capture d'une seule date de journée), en plus des
// lignes officielles réelles datées du 22/08 auxquelles les joueurs
// FootLight sont réellement rattachés. Depuis l'enrichissement du
// rapprochement de lib-sync-lequipe-match-stats.js, les DEUX lignes
// matchent désormais le même match scrapé, et clubRowsJournee.find() peut
// retomber sur le doublon (aucun joueur lié) au lieu de la ligne
// officielle — le score ne s'écrit alors jamais. Supprime ces doublons,
// uniquement s'ils n'ont RIEN dans matchs_joueur qui les référence
// (aucune perte de données possible).
//
// DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);

const CIBLES = [
  { division: 'N1', groupe: 'B', journee: 1 },
  { division: 'N1', groupe: 'C', journee: 1 },
];

let supprimes = 0, conserves = 0;
for (const cible of CIBLES) {
  const { data: rows, error } = await supabase
    .from('calendrier_officiel')
    .select('id, equipe_domicile, equipe_exterieur, date_match')
    .eq('saison', '2026-2027')
    .eq('division', cible.division)
    .eq('groupe', cible.groupe)
    .eq('journee', cible.journee)
    .order('id', { ascending: true });
  if (error) { console.error('Erreur lecture :', error.message); continue; }

  // Regroupe par date : la date majoritaire du groupe est la "vraie" date
  // officielle, les lignes sur une autre date sont les doublons suspects.
  const parDate = new Map();
  for (const r of rows) parDate.set(r.date_match, (parDate.get(r.date_match) || 0) + 1);
  const dateOfficielle = [...parDate.entries()].sort((a, b) => b[1] - a[1])[0][0];
  console.log(`\n${cible.division} groupe ${cible.groupe} journée ${cible.journee} : ${rows.length} ligne(s), date officielle majoritaire = ${dateOfficielle}`);

  for (const r of rows) {
    if (r.date_match === dateOfficielle) continue;
    const { data: mj, error: errMj } = await supabase
      .from('matchs_joueur')
      .select('id')
      .eq('calendrier_officiel_id', r.id)
      .limit(1);
    if (errMj) { console.error('Erreur matchs_joueur :', errMj.message); continue; }
    if (mj && mj.length) {
      console.log(`  CONSERVÉ (a des joueurs liés) id=${r.id} | ${r.date_match} | ${r.equipe_domicile} vs ${r.equipe_exterieur}`);
      conserves++;
      continue;
    }
    console.log(`  ${dryRun ? 'À supprimer' : 'Supprimé'} id=${r.id} | ${r.date_match} | ${r.equipe_domicile} vs ${r.equipe_exterieur}`);
    if (!dryRun) {
      const { error: errDel } = await supabase.from('calendrier_officiel').delete().eq('id', r.id);
      if (errDel) { console.error(`    Erreur suppression : ${errDel.message}`); continue; }
    }
    supprimes++;
  }
}
console.log(`\nRésumé : ${supprimes} ligne(s) ${dryRun ? 'à supprimer' : 'supprimée(s)'}, ${conserves} conservée(s) (joueurs liés).`);
