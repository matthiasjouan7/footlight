// Rattrapage à la demande des stats de match (lequipe.fr -> matchs_joueur)
// sur une ou plusieurs journées passées d'une compétition — utile quand un
// joueur est ajouté (et génère son calendrier) après que plusieurs journées
// ont déjà été jouées : le cron hebdomadaire (sync-lequipe-match-stats.js)
// ne traite que la journée affichée par défaut sur la page
// calendrier-resultats, il ne revient jamais en arrière sur les journées
// précédentes.
//
// Chaque journée a une URL stable sur lequipe.fr, ex:
//   .../page-calendrier-resultats/1re-journee
//   .../page-calendrier-resultats/2e-journee
//   ...
//   .../page-calendrier-resultats/34e-journee
// (vérifié via le sélecteur de journée .SelectNav de la page).
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';
import { syncMatchStats } from './lib-sync-lequipe-match-stats.js';

const competitionUrl = (process.env.COMPETITION_URL || '').replace(/\/+$/, '');
const journeesSpec = process.env.JOURNEES;
const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!competitionUrl) { console.error('COMPETITION_URL manquant (ex: https://www.lequipe.fr/Football/ligue-3/page-calendrier-resultats).'); process.exit(1); }
if (!journeesSpec) { console.error('JOURNEES manquant (ex: "3", "1-5", "1,2,7-9").'); process.exit(1); }
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant (nécessaire même en DRY_RUN, pour lire les données existantes).'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);

function parseJournees(spec) {
  const journees = new Set();
  for (const partie of spec.split(',').map((s) => s.trim()).filter(Boolean)) {
    const plage = partie.match(/^(\d+)-(\d+)$/);
    if (plage) {
      const [, debut, fin] = plage.map(Number);
      for (let j = Math.min(debut, fin); j <= Math.max(debut, fin); j++) journees.add(j);
    } else if (/^\d+$/.test(partie)) {
      journees.add(Number(partie));
    } else {
      console.error(`Entrée JOURNEES invalide : "${partie}" (attendu : nombre ou plage "1-5").`);
      process.exit(1);
    }
  }
  return [...journees].sort((a, b) => a - b);
}

// "1re journée", "2e journée", ..., "34e journée" -> "1re-journee", "2e-journee", ...
function ordinalJournee(n) {
  return n === 1 ? '1re-journee' : `${n}e-journee`;
}

const journees = parseJournees(journeesSpec);
console.log(`${journees.length} journée(s) à traiter : ${journees.join(', ')}\n`);

const supabase = createClient(supabaseUrl, supabaseKey);

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
