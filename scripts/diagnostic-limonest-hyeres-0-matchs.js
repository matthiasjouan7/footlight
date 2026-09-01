// Diagnostic lecture seule : l'utilisateur signale que les joueurs de
// Limonest et Hyères sont toujours à 0 matchs. Vérifie pour ces deux
// clubs : les joueurs concernés, leur nombre de matchs_joueur actuel, et
// l'état du calendrier officiel (lignes trouvées, rapprochement club).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const SAISON = '2026-2027';

// ── Copie fidèle de la logique canonique de rapprochement club ──
function normalizeName(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}
function normalizeClub(s) {
  return normalizeName(s).replace(/[.'/-]/g, ' ').replace(/\s+/g, ' ').trim().replace(/\s\d{1,2}$/, '');
}
const CLUB_MOTS_GENERIQUES = new Set([
  'fc', 'ofc', 'afc', 'asc', 'ac', 'sc', 'csc', 'cs', 'us', 'uso', 'as', 'sa', 'sas',
  'sr', 'srfa', 'ol', 'om', 'rc',
  'fco', 'osc', 'sco', 'ent', 'entente', 'athletic', 'olympique', 'football', 'club',
  'sporting', 'racing', 'stade',
  'sur', 'sous', 'en', 'la', 'le', 'les', 'de', 'du', 'des',
]);
const CLUB_MOTS_REMPLACEMENT = {
  st: 'saint', ste: 'sainte', gd: 'grand', philibert: 'philbert',
  virois: 'vire', bayonnais: 'bayonne', briochin: 'brieuc', vfc: 'vendee', sbfc: 'beaucairois',
  alenconnaise: 'alencon',
};
const CLUB_SYNONYMES_COMPLETS = {
  qrm: { mots: ['quevilly', 'rouen', 'metropole'], elargi: false },
  astdv: { mots: ['touques', 'deauville', 'trouville', 'villers'], elargi: true },
  alencon: { mots: ['alenconnaise', '61'], elargi: true },
  'anne sainte vertou': { mots: ['ussa'], elargi: true },
  'sables vf': { mots: ['sable', 'vendee'], elargi: false },
  'sable vendee': { mots: ['sable', 'vendee'], elargi: false },
  'sables vendee': { mots: ['sable', 'vendee'], elargi: false },
  'bourgoin j': { mots: ['jallieu'], elargi: true },
  'romorantin so': { mots: ['sologne'], elargi: true },
  // Locminé/Angoulême/Tarbes/Chateaubriant/Grand Ouest Lyonnais : calendrier_officiel
  // utilise des abréviations non reconnues par CLUB_MOTS_REMPLACEMENT pour ces
  // clubs précis (constaté en pratique : joueurs bloqués à 1-3 matchs alors que
  // le calendrier complet existe sous ce nom abrégé).
  'co locmine saint': { mots: ['colomban', 'locmine', 'saint'], elargi: false },
  'angouleme chte': { mots: ['angouleme', 'charente'], elargi: false },
  'pf tarbes': { mots: ['pyrenees', 'tarbes'], elargi: false },
  'chateaubriant volt': { mots: ['voltigeurs', 'chateaubriant'], elargi: false },
  'associat grand ouest': { mots: ['grand', 'ouest', 'association', 'lyonnaise'], elargi: false },
  'berri chateauroux': { mots: ['lb', 'chateauroux'], elargi: false },
};
const CLUB_PAIRES_DISTINCTES = new Set([
  ['apm metz', 'metz'].sort().join('|'),
  ['asptt dijon', 'dijon'].sort().join('|'),
]);
function clubWords(s) {
  const mots = normalizeClub(s).split(' ').filter(Boolean);
  const remplaces = mots.map((w) => CLUB_MOTS_REMPLACEMENT[w] || w);
  let sansGeneriques = remplaces.filter((w) => !CLUB_MOTS_GENERIQUES.has(w));
  if (sansGeneriques.includes('hyeres')) sansGeneriques = sansGeneriques.filter((w) => w !== '83');
  return sansGeneriques.length ? sansGeneriques : remplaces;
}
function clubIdentitySignature(s) {
  const cle = clubWords(s).slice().sort().join(' ');
  const synonyme = CLUB_SYNONYMES_COMPLETS[cle];
  return synonyme ? synonyme.mots.slice().sort().join(' ') : cle;
}
function clubWordsElargi(s) {
  const mots = clubWords(s);
  const cle = mots.slice().sort().join(' ');
  const synonyme = CLUB_SYNONYMES_COMPLETS[cle];
  return (synonyme && synonyme.elargi) ? [...mots, ...synonyme.mots] : mots;
}
function clubWordsMatch(a, b) {
  const sigA = clubIdentitySignature(a), sigB = clubIdentitySignature(b);
  if (sigA && sigB && sigA === sigB) return true;
  if (sigA && sigB && CLUB_PAIRES_DISTINCTES.has([sigA, sigB].sort().join('|'))) return false;
  const wa = clubWordsElargi(a), wb = clubWordsElargi(b);
  if (!wa.length || !wb.length) return false;
  const setA = new Set(wa), setB = new Set(wb);
  const small = wa.length <= wb.length ? setA : setB;
  const big = wa.length <= wb.length ? setB : setA;
  for (const w of small) if (!big.has(w)) return false;
  return true;
}
// ── Fin de la copie ──

async function selectAll(table, columns, filtre) {
  const pageSize = 1000;
  let toutes = [];
  let page = 0;
  for (;;) {
    let q = supabase.from(table).select(columns).range(page * pageSize, page * pageSize + pageSize - 1);
    if (filtre) q = filtre(q);
    const { data, error } = await q;
    if (error) { console.error(`Erreur lecture ${table} :`, error.message); process.exitCode = 1; return []; }
    toutes = toutes.concat(data || []);
    if (!data || data.length < pageSize) break;
    page++;
  }
  return toutes;
}

async function main() {
  const { data: joueurs, error: errJ } = await supabase
    .from('joueurs')
    .select('id, prenom, nom, club, niveau, saison')
    .or('club.ilike.%limonest%,club.ilike.%hyeres%,club.ilike.%hyères%')
    .eq('saison', SAISON);
  if (errJ) { console.error('Erreur joueurs :', errJ.message); process.exitCode = 1; return; }
  console.log(`${joueurs.length} joueur(s) dont le club contient "limonest" ou "hyeres".\n`);

  const niveaux = [...new Set(joueurs.map((j) => j.niveau))];
  console.log('Niveaux concernés :', niveaux.join(', '), '\n');

  const { data: mjAll, error: errMj } = await supabase
    .from('matchs_joueur')
    .select('id, joueur_id, date_match')
    .in('joueur_id', joueurs.map((j) => j.id))
    .eq('saison', SAISON);
  if (errMj) { console.error('Erreur matchs_joueur :', errMj.message); process.exitCode = 1; return; }

  for (const j of joueurs) {
    const n = mjAll.filter((m) => m.joueur_id === j.id).length;
    console.log(`  ${j.prenom} ${j.nom} — club="${j.club}" niveau=${j.niveau} — ${n} matchs_joueur`);
  }

  for (const niveau of niveaux) {
    console.log(`\n=== Calendrier officiel ${niveau} ${SAISON} ===`);
    const calendrier = await selectAll('calendrier_officiel', 'id, equipe_domicile, equipe_exterieur, date_match, division, groupe', (q) => q.eq('division', niveau).eq('saison', SAISON));
    console.log(`${calendrier.length} ligne(s) au total.`);

    const clubsDistincts = [...new Set(joueurs.filter((j) => j.niveau === niveau).map((j) => j.club))];
    for (const club of clubsDistincts) {
      const matchsClub = calendrier.filter((row) => clubWordsMatch(row.equipe_domicile, club) || clubWordsMatch(row.equipe_exterieur, club));
      console.log(`\n  Club joueur = "${club}" (mots=${JSON.stringify(clubWords(club))}, signature="${clubIdentitySignature(club)}")`);
      console.log(`  ${matchsClub.length} ligne(s) calendrier correspondante(s) via clubWordsMatch.`);
      const rencontres = new Map();
      matchsClub.forEach((row) => {
        if (clubWordsMatch(row.equipe_domicile, club)) rencontres.set(clubIdentitySignature(row.equipe_domicile), row.equipe_domicile);
        if (clubWordsMatch(row.equipe_exterieur, club)) rencontres.set(clubIdentitySignature(row.equipe_exterieur), row.equipe_exterieur);
      });
      console.log(`  Rencontres distinctes (signature → nom) : ${rencontres.size}`);
      for (const [sig, nom] of rencontres) console.log(`    "${sig}" → "${nom}"`);
      if (!matchsClub.length) {
        // Cherche des noms de calendrier proches (contenant "limonest"/"hyer") pour voir sous quel nom le club existe vraiment.
        const proches = calendrier.filter((row) => {
          const dom = normalizeClub(row.equipe_domicile), ext = normalizeClub(row.equipe_exterieur);
          return dom.includes('limonest') || ext.includes('limonest') || dom.includes('hyer') || ext.includes('hyer');
        });
        console.log(`  Aucune correspondance. ${proches.length} ligne(s) calendrier contenant "limonest"/"hyer" (par recherche brute) :`);
        for (const p of proches.slice(0, 10)) console.log(`    id=${p.id} | "${p.equipe_domicile}" vs "${p.equipe_exterieur}" | groupe=${p.groupe}`);
      }
    }
  }
}

main().finally(() => process.exit(process.exitCode || 0));
