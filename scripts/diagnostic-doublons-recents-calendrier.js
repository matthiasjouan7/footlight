// Diagnostic lecture seule : id=3396 ("Lorient B" vs "Chauray", créé
// aujourd'hui 2026-09-01) duplique id=245 ("FC LORIENT 2" vs "FC Chauray",
// existant depuis longtemps) sans qu'aucun des deux scripts de fusion
// existants ne le détecte, car ni l'une ni l'autre ligne n'est en style
// "legacy" tout-capitales (condition requise par les deux scripts). Cherche
// systématiquement, dans TOUTE la base calendrier_officiel, les lignes
// créées récemment (aujourd'hui) qui dupliquent une ligne plus ancienne pour
// les deux mêmes équipes à quelques jours d'écart — quel que soit le style
// de casse.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const SAISON = '2026-2027';
const TOLERANCE_JOURS = 3;

function normalizeName(s) { return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' '); }
function normalizeClub(s) { return normalizeName(s).replace(/[.'/-]/g, ' ').replace(/\s+/g, ' ').trim().replace(/\s\d{1,2}$/, ''); }
const CLUB_MOTS_GENERIQUES = new Set(['fc', 'ofc', 'afc', 'asc', 'ac', 'sc', 'csc', 'cs', 'us', 'uso', 'as', 'sa', 'sas', 'sr', 'srfa', 'ol', 'om', 'rc', 'fco', 'osc', 'sco', 'ent', 'entente', 'athletic', 'olympique', 'football', 'club', 'sporting', 'racing', 'stade', 'sur', 'sous', 'en', 'la', 'le', 'les', 'de', 'du', 'des']);
const CLUB_MOTS_REMPLACEMENT = { st: 'saint', ste: 'sainte', gd: 'grand', philibert: 'philbert', virois: 'vire', bayonnais: 'bayonne', briochin: 'brieuc', vfc: 'vendee', sbfc: 'beaucairois', alenconnaise: 'alencon', raph: 'raphael' };
function clubWords(s) {
  const mots = normalizeClub(s).split(' ').filter(Boolean).map((w) => CLUB_MOTS_REMPLACEMENT[w] || w);
  let sansGeneriques = mots.filter((w) => !CLUB_MOTS_GENERIQUES.has(w));
  if (sansGeneriques.includes('hyeres')) sansGeneriques = sansGeneriques.filter((w) => w !== '83');
  return sansGeneriques.length ? sansGeneriques : mots;
}
function clubsCorrespondent(a, b) {
  const wa = clubWords(a), wb = clubWords(b);
  if (!wa.length || !wb.length) return false;
  const setA = new Set(wa), setB = new Set(wb);
  const small = wa.length <= wb.length ? setA : setB;
  const big = wa.length <= wb.length ? setB : setA;
  for (const w of small) if (!big.has(w)) return false;
  return true;
}
function equipesCorrespondent(a, b) {
  return (clubsCorrespondent(a.equipe_domicile, b.equipe_domicile) && clubsCorrespondent(a.equipe_exterieur, b.equipe_exterieur))
    || (clubsCorrespondent(a.equipe_domicile, b.equipe_exterieur) && clubsCorrespondent(a.equipe_exterieur, b.equipe_domicile));
}
function joursEcart(d1, d2) { return Math.abs((new Date(d1) - new Date(d2)) / 86400000); }

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

const cal = await fetchToutesPages('calendrier_officiel', 'id, division, groupe, journee, date_match, equipe_domicile, equipe_exterieur, created_at', (q) => q.eq('saison', SAISON));
console.log(`${cal.length} ligne(s) calendrier_officiel saison ${SAISON}.`);

const AUJOURD_HUI = '2026-09-01';
const recentes = cal.filter((r) => (r.created_at || '').startsWith(AUJOURD_HUI));
console.log(`${recentes.length} ligne(s) créée(s) aujourd'hui (${AUJOURD_HUI}).`);

const parDivGroupe = new Map();
for (const r of cal) {
  const cle = `${r.division}::${r.groupe}`;
  if (!parDivGroupe.has(cle)) parDivGroupe.set(cle, []);
  parDivGroupe.get(cle).push(r);
}

let totalDoublons = 0;
for (const r of recentes) {
  const cle = `${r.division}::${r.groupe}`;
  const candidats = (parDivGroupe.get(cle) || []).filter((c) =>
    c.id !== r.id && !(c.created_at || '').startsWith(AUJOURD_HUI) &&
    joursEcart(c.date_match, r.date_match) <= TOLERANCE_JOURS && equipesCorrespondent(r, c)
  );
  if (candidats.length) {
    totalDoublons++;
    console.log(`\nid=${r.id} (créé aujourd'hui, ${r.date_match}) "${r.equipe_domicile}" vs "${r.equipe_exterieur}" [${r.division} ${r.groupe} j${r.journee}]`);
    for (const c of candidats) {
      const { count: countR } = await supabase.from('matchs_joueur').select('id', { count: 'exact', head: true }).eq('calendrier_officiel_id', r.id);
      const { count: countC } = await supabase.from('matchs_joueur').select('id', { count: 'exact', head: true }).eq('calendrier_officiel_id', c.id);
      console.log(`  <-> id=${c.id} (existante, créée ${c.created_at}, ${c.date_match}) "${c.equipe_domicile}" vs "${c.equipe_exterieur}" — nouvelle:${countR} matchs_joueur, existante:${countC} matchs_joueur`);
    }
  }
}
console.log(`\n${totalDoublons} ligne(s) récente(s) dupliquant une ligne existante (toutes divisions/groupes).`);
