// Diagnostic lecture seule, générique et réutilisable pour tout cas
// "club bloqué à N match(es) car le nom ne matche pas assez large" (ex.
// Locminé, Fréjus, Angoulême...). Cherche un fragment de nom (SUBSTR, sans
// accents/casse) à la fois dans joueurs.club (toutes divisions confondues)
// et dans calendrier_officiel.equipe_domicile/equipe_exterieur, puis
// affiche pour chaque paire joueurs-club / ligne-calendrier le verdict de
// clubWordsMatch (la fonction utilisée par genere-calendrier-club.js) afin
// de repérer les faux négatifs (lignes qui désignent clairement le même
// club mais que l'algorithme actuel ne rapproche pas).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const SUBSTR = process.env.SUBSTR;
if (!SUBSTR) { console.error('SUBSTR manquant (fragment de nom, ex: "angoul").'); process.exit(1); }
const SAISON = process.env.SAISON || '2026-2027';

function normalizeName(s) { return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' '); }
function normalizeClub(s) { return normalizeName(s).replace(/[.'/-]/g, ' ').replace(/\s+/g, ' ').trim().replace(/\s\d{1,2}$/, ''); }
const CLUB_MOTS_GENERIQUES = new Set(['fc', 'ofc', 'afc', 'asc', 'ac', 'sc', 'csc', 'cs', 'us', 'uso', 'as', 'sa', 'sas', 'sr', 'srfa', 'ol', 'om', 'rc', 'fco', 'osc', 'sco', 'ent', 'entente', 'athletic', 'olympique', 'football', 'club', 'sporting', 'racing', 'stade', 'sur', 'sous', 'en', 'la', 'le', 'les', 'de', 'du', 'des']);
const CLUB_MOTS_REMPLACEMENT = { st: 'saint', ste: 'sainte', gd: 'grand', philibert: 'philbert', virois: 'vire', bayonnais: 'bayonne', briochin: 'brieuc', vfc: 'vendee', sbfc: 'beaucairois', alenconnaise: 'alencon' };
function clubWords(s) {
  const mots = normalizeClub(s).split(' ').filter(Boolean).map((w) => CLUB_MOTS_REMPLACEMENT[w] || w);
  let sansGeneriques = mots.filter((w) => !CLUB_MOTS_GENERIQUES.has(w));
  if (sansGeneriques.includes('hyeres')) sansGeneriques = sansGeneriques.filter((w) => w !== '83');
  return sansGeneriques.length ? sansGeneriques : mots;
}
function clubIdentitySignature(s) { return clubWords(s).slice().sort().join(' '); }
function clubWordsMatch(a, b) {
  if (clubIdentitySignature(a) === clubIdentitySignature(b)) return true;
  const wa = clubWords(a), wb = clubWords(b);
  if (!wa.length || !wb.length) return false;
  const setA = new Set(wa), setB = new Set(wb);
  const small = wa.length <= wb.length ? setA : setB;
  const big = wa.length <= wb.length ? setB : setA;
  for (const w of small) if (!big.has(w)) return false;
  return true;
}

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

const frag = normalizeName(SUBSTR);

async function main() {
  const joueurs = await fetchToutesPages('joueurs', 'id, prenom, nom, club, niveau, saison', (q) => q.eq('saison', SAISON));
  const clubsJoueurs = [...new Set(joueurs.filter((j) => normalizeName(j.club).includes(frag)).map((j) => `${j.club} (${j.niveau})`))];
  console.log(`Clubs distincts dans joueurs contenant "${SUBSTR}" :`);
  clubsJoueurs.forEach((c) => console.log(`  - ${c}`));

  const calendrier = await fetchToutesPages('calendrier_officiel', 'id, division, groupe, equipe_domicile, equipe_exterieur, saison', (q) => q.eq('saison', SAISON));
  const equipesCalendrier = new Set();
  for (const row of calendrier) {
    if (normalizeName(row.equipe_domicile).includes(frag)) equipesCalendrier.add(`${row.equipe_domicile} (${row.division} ${row.groupe})`);
    if (normalizeName(row.equipe_exterieur).includes(frag)) equipesCalendrier.add(`${row.equipe_exterieur} (${row.division} ${row.groupe})`);
  }
  console.log(`\nÉquipes distinctes dans calendrier_officiel contenant "${SUBSTR}" :`);
  [...equipesCalendrier].forEach((c) => console.log(`  - ${c}`));

  console.log('\n--- Vérification clubWordsMatch entre chaque paire (club joueurs) x (équipe calendrier) ---');
  const clubsJoueursBruts = [...new Set(joueurs.filter((j) => normalizeName(j.club).includes(frag)).map((j) => j.club))];
  const equipesCalendrierBrutes = [...new Set(calendrier.flatMap((r) => [r.equipe_domicile, r.equipe_exterieur]).filter((e) => normalizeName(e).includes(frag)))];
  for (const cj of clubsJoueursBruts) {
    for (const ec of equipesCalendrierBrutes) {
      const match = clubWordsMatch(cj, ec);
      console.log(`  "${cj}" vs "${ec}" -> ${match ? 'MATCH' : 'NE MATCHE PAS'} (mots: [${clubWords(cj).join(',')}] vs [${clubWords(ec).join(',')}])`);
    }
  }

  // Pour chaque club joueurs trouvé, compte combien de lignes calendrier lui sont effectivement rattachées par groupe.
  console.log('\n--- Nombre de lignes calendrier rattachées (clubWordsMatch) par club/niveau/groupe ---');
  for (const cj of clubsJoueursBruts) {
    const niveau = joueurs.find((j) => j.club === cj)?.niveau;
    const parGroupe = new Map();
    for (const row of calendrier.filter((r) => r.division === niveau)) {
      if (clubWordsMatch(row.equipe_domicile, cj) || clubWordsMatch(row.equipe_exterieur, cj)) {
        parGroupe.set(row.groupe, (parGroupe.get(row.groupe) || 0) + 1);
      }
    }
    console.log(`  "${cj}" (${niveau}) : ${[...parGroupe.entries()].map(([g, n]) => `groupe ${g}=${n}`).join(', ') || 'AUCUNE ligne rattachée'}`);
  }
}

main().finally(() => process.exit(process.exitCode || 0));
