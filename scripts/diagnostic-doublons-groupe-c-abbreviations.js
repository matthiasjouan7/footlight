// Diagnostic lecture seule : le doublon Berri/Châteauroux (voir
// diagnostic-doublons-locmine-angouleme.js) suggère que calendrier_officiel
// contient, pour National 1 groupe C, deux séries de lignes pour les mêmes
// matchs réels — une série "abrégée" (BERRI CHATEAUROUX, FCLDSD, GRAND OUEST
// ASSOCIAT, EFC FREJUS ST RAPH, ESTAC TROYES 2, GFA RV, UNION FOOT
// TOURAINE...) et une série "canonique" plus récente (Châteauroux, Limonest,
// GOAL FC, Fréjus-Saint-Raphaël, Troyes B, Rumilly Vallières, UF Touraine).
// Vérifie l'ampleur réelle : combien de dates du groupe C ont plusieurs
// lignes calendrier (toutes équipes confondues, pas seulement Châteauroux).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const SAISON = '2026-2027';
const NIVEAU = 'N1';
const GROUPE = 'C';

const { data: rows, error } = await supabase.from('calendrier_officiel').select('id, date_match, equipe_domicile, equipe_exterieur').eq('division', NIVEAU).eq('groupe', GROUPE).eq('saison', SAISON);
if (error) { console.error('Erreur :', error.message); process.exit(1); }
console.log(`${rows.length} ligne(s) calendrier_officiel pour ${NIVEAU} groupe ${GROUPE}.\n`);

const parDate = new Map();
for (const r of rows) {
  if (!parDate.has(r.date_match)) parDate.set(r.date_match, []);
  parDate.get(r.date_match).push(r);
}

const datesMultiples = [...parDate.entries()].filter(([, liste]) => liste.length > 1).sort(([a], [b]) => a.localeCompare(b));
console.log(`Dates avec plusieurs lignes calendrier : ${datesMultiples.length} sur ${parDate.size} date(s) distincte(s).\n`);
let totalLignesEnTrop = 0;
for (const [date, liste] of datesMultiples) {
  console.log(`${date} (${liste.length} lignes) :`);
  liste.forEach((r) => console.log(`  id=${r.id} "${r.equipe_domicile}" vs "${r.equipe_exterieur}"`));
  totalLignesEnTrop += liste.length - 1;
}
console.log(`\nTotal de lignes "en trop" (au-delà d'une par date) : ${totalLignesEnTrop}.`);

// Vue d'ensemble : équipes distinctes citées dans les dates en doublon, pour repérer tous les clubs concernés.
const equipesConcernees = new Set();
for (const [, liste] of datesMultiples) {
  for (const r of liste) { equipesConcernees.add(r.equipe_domicile); equipesConcernees.add(r.equipe_exterieur); }
}
console.log(`\nÉquipes distinctes apparaissant dans une date en doublon (${equipesConcernees.size}) :`);
[...equipesConcernees].sort().forEach((e) => console.log(`  - ${e}`));
