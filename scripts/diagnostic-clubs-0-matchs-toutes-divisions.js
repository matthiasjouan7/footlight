// Diagnostic lecture seule : liste tous les clubs (toutes divisions,
// saison 2026-2027) dont AUCUN joueur n'a matchs_joues > 0, alors qu'un
// match déjà joué (date_match dans le passé) existe pour ce club dans
// calendrier_officiel — c'est-à-dire un vrai trou de synchro des stats,
// pas simplement une saison qui n'a pas encore commencé pour ce club.
// Réutilise la logique de rapprochement de nom de club de
// sync-fff-match-stats-n2.js pour associer joueurs.club aux lignes
// calendrier_officiel malgré les sigles/abréviations.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

function normaliserClub(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
const MOTS_GENERIQUES_CLUB = new Set(['fc', 'ofc', 'afc', 'asc', 'ac', 'sc', 'csc', 'cs', 'us', 'uso', 'as', 'sm', 'sa', 'vf', 'football', 'club', 'sporting', 'racing', 'stade', 'olympique', 'ol', 'd', '1', 'sur', 'sous', 'en', 'la', 'le', 'les', 'de', 'du', 'des']);
function motsClub(s) {
  const mots = normaliserClub(s).split(' ').filter(Boolean).filter((w) => !MOTS_GENERIQUES_CLUB.has(w));
  return mots.length ? mots : normaliserClub(s).split(' ').filter(Boolean);
}
const LETTRE_VERS_CHIFFRE_RESERVE = { b: '2', c: '3', d: '4', e: '5', f: '6', g: '7', h: '8' };
function canonicaliserMot(w) { return LETTRE_VERS_CHIFFRE_RESERVE[w] || w; }
function motsCorrespondent(a, b) {
  const ca = canonicaliserMot(a), cb = canonicaliserMot(b);
  if (ca === cb) return true;
  const [court, long] = a.length <= b.length ? [a, b] : [b, a];
  return court.length >= 4 && long.startsWith(court);
}
function clubsCorrespondent(a, b) {
  const wa = motsClub(a), wb = motsClub(b);
  if (!wa.length || !wb.length) return false;
  const [small, big] = wa.length <= wb.length ? [wa, wb] : [wb, wa];
  for (const w of small) if (!big.some((w2) => motsCorrespondent(w, w2))) return false;
  return true;
}

const SAISON = '2026-2027';
const AUJOURDHUI = new Date().toISOString().slice(0, 10);

async function fetchToutesLesLignes(construireRequete) {
  const TAILLE_PAGE = 1000;
  let toutes = [];
  let page = 0;
  while (true) {
    const { data, error } = await construireRequete().range(page * TAILLE_PAGE, (page + 1) * TAILLE_PAGE - 1);
    if (error) { console.error('Erreur pagination :', error.message); process.exit(1); }
    toutes = toutes.concat(data || []);
    if (!data || data.length < TAILLE_PAGE) break;
    page++;
  }
  return toutes;
}

const joueurs = await fetchToutesLesLignes(() =>
  supabase.from('joueurs').select('id, club, niveau, saison, matchs_joues').eq('saison', SAISON)
);
const calendrier = await fetchToutesLesLignes(() =>
  supabase.from('calendrier_officiel').select('id, division, groupe, equipe_domicile, equipe_exterieur, date_match').eq('saison', SAISON)
);

const parClub = new Map();
for (const j of joueurs) {
  const clef = `${j.club} | ${j.niveau}`;
  if (!parClub.has(clef)) parClub.set(clef, []);
  parClub.get(clef).push(j);
}

const resultats = [];
for (const [clef, liste] of parClub) {
  const avecMatch = liste.filter((j) => (j.matchs_joues || 0) > 0).length;
  if (avecMatch > 0) continue;
  const [club, niveau] = clef.split(' | ');
  const calDivision = calendrier.filter((c) => c.division === niveau);
  const matchsClub = calDivision.filter((c) => clubsCorrespondent(club, c.equipe_domicile) || clubsCorrespondent(club, c.equipe_exterieur));
  const matchsJoues = matchsClub.filter((c) => c.date_match && c.date_match <= AUJOURDHUI);
  if (matchsJoues.length > 0) {
    resultats.push({ club, niveau, nbJoueurs: liste.length, nbMatchsJoues: matchsJoues.length, premierMatch: matchsJoues.sort((a, b) => a.date_match.localeCompare(b.date_match))[0] });
  }
}

resultats.sort((a, b) => a.niveau.localeCompare(b.niveau) || a.club.localeCompare(b.club));
console.log(`${resultats.length} club(s) avec au moins un match déjà joué mais 0 joueur avec des stats :\n`);
for (const r of resultats) {
  console.log(`  [${r.niveau}] "${r.club}" — ${r.nbJoueurs} joueur(s), ${r.nbMatchsJoues} match(s) déjà joué(s), 1er le ${r.premierMatch.date_match} ("${r.premierMatch.equipe_domicile}" vs "${r.premierMatch.equipe_exterieur}", calendrier_officiel_id=${r.premierMatch.id})`);
}
