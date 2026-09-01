// Généralisation de diagnostic-doublons-groupe-c-abbreviations.js à toutes
// les divisions/groupes : National 1 groupe C avait son calendrier
// entièrement dupliqué (série "legacy" en MAJUSCULES + série canonique pour
// les mêmes matchs, 397 lignes en trop). Vérifie si d'autres groupes (N1
// A/B, N2 A-H, Ligue 3) ont le même problème, pour savoir s'il faut
// généraliser la fusion ou si c'était un cas isolé à groupe C.
//
// Lecture seule. Résumé compact (pas le détail ligne par ligne, pour rester
// lisible sur plusieurs dizaines de groupes) : nombre de dates en doublon et
// de lignes "en trop" par division/groupe, uniquement pour les groupes
// concernés.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const SAISON = '2026-2027';

async function fetchToutesPages(table, select, filtre) {
  let toutes = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    let q = supabase.from(table).select(select).range(from, from + pageSize - 1);
    if (filtre) q = filtre(q);
    const { data, error } = await q;
    if (error) { console.error(`Erreur ${table} :`, error.message); process.exit(1); }
    toutes = toutes.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return toutes;
}

const rows = await fetchToutesPages('calendrier_officiel', 'id, division, groupe, date_match, equipe_domicile, equipe_exterieur', (q) => q.eq('saison', SAISON));
console.log(`${rows.length} ligne(s) calendrier_officiel au total pour la saison ${SAISON}.\n`);

const parDivisionGroupe = new Map();
for (const r of rows) {
  const cle = `${r.division} ${r.groupe}`;
  if (!parDivisionGroupe.has(cle)) parDivisionGroupe.set(cle, []);
  parDivisionGroupe.get(cle).push(r);
}

const resultats = [];
for (const [cle, liste] of parDivisionGroupe) {
  const parDate = new Map();
  for (const r of liste) {
    if (!parDate.has(r.date_match)) parDate.set(r.date_match, []);
    parDate.get(r.date_match).push(r);
  }
  const datesMultiples = [...parDate.entries()].filter(([, l]) => l.length > 1);
  const totalEnTrop = datesMultiples.reduce((acc, [, l]) => acc + (l.length - 1), 0);
  resultats.push({ cle, totalLignes: liste.length, dateCount: parDate.size, datesMultiples: datesMultiples.length, totalEnTrop });
}
resultats.sort((a, b) => b.totalEnTrop - a.totalEnTrop);

console.log('--- Groupes triés par nombre de lignes "en trop" décroissant ---');
for (const r of resultats) {
  console.log(`  ${r.cle} : ${r.totalLignes} ligne(s), ${r.dateCount} date(s) distincte(s), ${r.datesMultiples} date(s) avec plusieurs lignes, ${r.totalEnTrop} ligne(s) en trop.`);
}

const concernes = resultats.filter((r) => r.totalEnTrop > 0);
console.log(`\n${concernes.length} groupe(s) sur ${resultats.length} présentent au moins un doublon de date.`);
