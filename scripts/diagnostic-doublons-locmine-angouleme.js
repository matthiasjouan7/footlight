// Diagnostic lecture seule : pour Locminé (N1 groupe B) et Angoulême (N1
// groupe B), calendrier_officiel contient deux orthographes différentes du
// même club (héritage d'anciennes synchros avant la correction du
// rapprochement de nom dans sync-lequipe-to-calendrier.js) :
//   - "LOCMINE ST CO" vs "Locminé"
//   - "ANGOULEME CHTE FC" vs "Angoulême"
// "Saint-Colomban Locminé"/"Angoulême Charente FC" (les noms utilisés par
// les joueurs) ne matchent qu'une des deux orthographes, ce qui bloque la
// génération de leur calendrier pour la plupart des journées.
// Vérifie si les deux orthographes désignent bien les MÊMES journées
// (doublon à fusionner, comme Hyères/Limonest) ou des journées DIFFÉRENTES
// (simple renommage à appliquer, sans doublon).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const SAISON = '2026-2027';

async function analyser(nomA, nomB) {
  const { data: rowsA, error: errA } = await supabase.from('calendrier_officiel').select('id, date_match, equipe_domicile, equipe_exterieur, groupe').eq('division', 'N1').eq('saison', SAISON).or(`equipe_domicile.eq.${nomA},equipe_exterieur.eq.${nomA}`);
  const { data: rowsB, error: errB } = await supabase.from('calendrier_officiel').select('id, date_match, equipe_domicile, equipe_exterieur, groupe').eq('division', 'N1').eq('saison', SAISON).or(`equipe_domicile.eq.${nomB},equipe_exterieur.eq.${nomB}`);
  if (errA || errB) { console.error('Erreur :', errA?.message, errB?.message); return; }
  console.log(`\n"${nomA}" : ${rowsA.length} ligne(s). "${nomB}" : ${rowsB.length} ligne(s).`);
  const datesA = new Set(rowsA.map((r) => r.date_match));
  const datesB = new Set(rowsB.map((r) => r.date_match));
  const communes = [...datesA].filter((d) => datesB.has(d));
  console.log(`Dates en commun (doublon potentiel) : ${communes.length}`);
  communes.forEach((d) => {
    const ra = rowsA.find((r) => r.date_match === d);
    const rb = rowsB.find((r) => r.date_match === d);
    console.log(`  ${d} : [${nomA}] id=${ra.id} "${ra.equipe_domicile}" vs "${ra.equipe_exterieur}"  |  [${nomB}] id=${rb.id} "${rb.equipe_domicile}" vs "${rb.equipe_exterieur}"`);
  });
  const seulementA = [...datesA].filter((d) => !datesB.has(d));
  const seulementB = [...datesB].filter((d) => !datesA.has(d));
  console.log(`Dates seulement dans "${nomA}" : ${seulementA.length} (${seulementA.slice(0, 5).join(', ')}${seulementA.length > 5 ? '...' : ''})`);
  console.log(`Dates seulement dans "${nomB}" : ${seulementB.length} (${seulementB.slice(0, 5).join(', ')}${seulementB.length > 5 ? '...' : ''})`);
}

await analyser('LOCMINE ST CO', 'Locminé');
await analyser('ANGOULEME CHTE FC', 'Angoulême');
await analyser('BERRI CHATEAUROUX', 'Châteauroux');
