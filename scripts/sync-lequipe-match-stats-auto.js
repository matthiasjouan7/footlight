// Rattrapage automatique des stats de match (lequipe.fr -> matchs_joueur)
// pour TOUTES les journées déjà jouées d'une compétition (pas seulement la
// dernière) — remplace le comportement de sync-lequipe-match-stats.js (une
// seule journée, celle affichée par défaut) pour que l'automatisation
// planifiée rattrape d'elle-même n'importe quel joueur ajouté (et dont le
// calendrier est généré) après plusieurs journées déjà jouées, sans
// intervention manuelle.
//
// Détermine division/groupe/saison depuis la page de base de la
// compétition, puis interroge calendrier_officiel pour savoir quelles
// journées sont déjà passées (date_match <= aujourd'hui) avant de les
// rattraper une à une.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';
import { syncMatchStats, ordinalJournee, detecterCompetition } from './lib-sync-lequipe-match-stats.js';

const competitionUrl = (process.env.COMPETITION_URL || '').replace(/\/+$/, '');
const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!competitionUrl) { console.error('COMPETITION_URL manquant.'); process.exit(1); }
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);

const supabase = createClient(supabaseUrl, supabaseKey);

const competition = await detecterCompetition(competitionUrl);
if (!competition || !competition.division || !competition.groupe || !competition.saison) {
  console.error(`Impossible de déterminer la compétition depuis ${competitionUrl} — abandon.`);
  process.exit(1);
}
const { division, groupe, saison } = competition;
console.log(`Compétition détectée : division="${division}" groupe="${groupe}" saison="${saison}"`);

const aujourdhui = new Date().toISOString().slice(0, 10);
const { data: matchsJoues, error: matchsErr } = await supabase
  .from('calendrier_officiel')
  .select('journee, date_match')
  .eq('division', division)
  .eq('groupe', groupe)
  .eq('saison', saison)
  .lte('date_match', aujourdhui);
if (matchsErr) { console.error(`Erreur lecture calendrier_officiel : ${matchsErr.message}`); process.exit(1); }

const journees = [...new Set((matchsJoues || []).map((m) => m.journee))].filter((j) => j != null).sort((a, b) => a - b);
console.log(`${journees.length} journée(s) déjà jouée(s) à rattraper (<= ${aujourdhui}) : ${journees.join(', ') || '(aucune)'}\n`);

let totalJoueursLies = 0, totalMaj = 0, totalDejaRenseignes = 0, totalAmbigus = 0, echecs = 0;

for (const j of journees) {
  const url = `${competitionUrl}/${ordinalJournee(j)}`;
  console.log(`\n========== Journée ${j} (${url}) ==========`);
  const resultat = await syncMatchStats(url, supabase, dryRun);
  if (!resultat) { echecs++; continue; }
  totalJoueursLies += resultat.totalJoueursLies;
  totalMaj += resultat.totalMaj;
  totalDejaRenseignes += resultat.totalDejaRenseignes;
  totalAmbigus += resultat.totalAmbigus;
}

console.log(`\n========== Résumé global (${journees.length} journée(s), ${echecs} échec(s)) ==========`);
console.log(`${totalJoueursLies} joueur(s) FootLight lié(s) examiné(s), ${totalMaj} mise(s) à jour ${dryRun ? 'proposée(s)' : 'effectuée(s)'}, ${totalDejaRenseignes} champ(s) déjà renseigné(s) laissé(s) tel quel, ${totalAmbigus} ambiguïté(s) ignorée(s).`);
if (dryRun) console.log('DRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
