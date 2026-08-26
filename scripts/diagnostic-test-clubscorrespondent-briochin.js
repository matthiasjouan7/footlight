// Test unitaire direct : pourquoi clubsCorrespondent("Stade Briochin",
// "Saint-Brieuc") / ("Vendée Poiré Football", "Le Poiré-sur-Vie") ne
// matche pas en pratique alors que le calcul manuel dit que si.
function normaliserClub(str) {
  return (str || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[.'/-]/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(/\s(\d{1,2}|[bc])$/, '');
}
const MOTS_GENERIQUES_CLUB = new Set(['fc', 'ofc', 'afc', 'asc', 'ac', 'sc', 'csc', 'cs', 'us', 'uso', 'as', 'sm', 'sa', 'ol', 'om', 'rc', 'fco', 'osc', 'sco', 'ent', 'entente', 'athletic', 'football', 'club', 'sporting', 'racing', 'stade', 'olympique', 'efc', 'srfa', 'sur', 'sous', 'en', 'la', 'le', 'les', 'de', 'du', 'des']);
const MOTS_REMPLACEMENT_CLUB = {
  st: 'saint', ste: 'sainte', gd: 'grand', philibert: 'philbert',
  virois: 'vire', bayonnais: 'bayonne', briochin: 'brieuc',
};
const CLUB_SYNONYMES_COMPLETS_STATS = {
  fcldsd: { mots: ['limonest'], elargi: false },
  goal: { mots: ['grand', 'ouest', 'associat'], elargi: false },
  'poire vendee': { mots: ['poire', 'vie'], elargi: false },
};
function motsClub(s) {
  const mots = normaliserClub(s).split(' ').filter(Boolean);
  const remplaces = mots.map((w) => MOTS_REMPLACEMENT_CLUB[w] || w);
  const sansGeneriques = remplaces.filter((w) => !MOTS_GENERIQUES_CLUB.has(w));
  return sansGeneriques.length ? sansGeneriques : remplaces;
}
function signatureClub(s) {
  const cle = motsClub(s).slice().sort().join(' ');
  const synonyme = CLUB_SYNONYMES_COMPLETS_STATS[cle];
  return synonyme ? synonyme.mots.slice().sort().join(' ') : cle;
}
function motsClubElargi(s) {
  const mots = motsClub(s);
  const cle = mots.slice().sort().join(' ');
  const synonyme = CLUB_SYNONYMES_COMPLETS_STATS[cle];
  return (synonyme && synonyme.elargi) ? [...mots, ...synonyme.mots] : mots;
}
function clubsCorrespondent(a, b) {
  const sigA = signatureClub(a), sigB = signatureClub(b);
  if (sigA && sigB && sigA === sigB) return true;
  const wa = motsClubElargi(a), wb = motsClubElargi(b);
  if (!wa.length || !wb.length) return false;
  const setA = new Set(wa), setB = new Set(wb);
  const [small, big] = wa.length <= wb.length ? [setA, setB] : [setB, setA];
  for (const w of small) if (!big.has(w)) return false;
  return true;
}

const paires = [
  ['Stade Briochin', 'Saint-Brieuc'],
  ['Vendée Poiré Football', 'Le Poiré-sur-Vie'],
];
for (const [a, b] of paires) {
  console.log(`"${a}" vs "${b}"`);
  console.log(`  motsClub(a)=${JSON.stringify(motsClub(a))} signature=${signatureClub(a)}`);
  console.log(`  motsClub(b)=${JSON.stringify(motsClub(b))} signature=${signatureClub(b)}`);
  console.log(`  clubsCorrespondent = ${clubsCorrespondent(a, b)}`);
}
