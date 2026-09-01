// Nouvelle cause de doublon calendrier, distincte de celle déjà corrigée
// (corrige-doublons-calendrier-toutes-divisions.js, qui exige la MÊME
// date_match exacte entre la ligne legacy et la ligne canonique) :
// diagnostic-lyon-duchere-j1-non-comptabilise.js a montré que pour Lyon La
// Duchère et AS Saint-Priest, la ligne calendrier legacy du match de
// journée 1 est datée UN JOUR APRÈS la ligne canonique du même match réel
// (ex: "EFC FREJUS ST RAPH vs ST-PRIEST" legacy le 2026-08-22, alors que
// "Fréjus-Saint-Raphaël vs Saint-Priest" canonique est daté 2026-08-21).
// Comme la fusion précédente regroupait les lignes STRICTEMENT par date
// exacte, ces paires n'ont jamais été rapprochées : les matchs_joueur
// pointent vers la ligne legacy (jamais synchronisée en stats, score et
// minutes toujours null), donc ce match n'est jamais compté.
//
// Ce script apparie chaque ligne legacy (deux noms d'équipe entièrement en
// majuscules) à une ligne canonique du MÊME groupe si :
//   - les deux équipes correspondent (clubsCorrespondent, dans un sens ou
//     l'autre pour gérer une éventuelle inversion domicile/extérieur), ET
//   - l'écart de date est au maximum TOLERANCE_JOURS jours.
// Si exactement une ligne canonique correspond, la paire est retenue :
// tous les matchs_joueur de la ligne legacy sont redirigés vers la ligne
// canonique (ou supprimés s'ils feraient doublon), puis la ligne legacy
// est supprimée si tous ses matchs_joueur ont été résolus sans ambiguïté.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const SAISON = '2026-2027';
const TOLERANCE_JOURS = 3;
const TAILLE_LOT = 50;

function normalizeName(s) { return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' '); }
function normalizeClub(s) { return normalizeName(s).replace(/[.'/-]/g, ' ').replace(/\s+/g, ' ').trim().replace(/\s\d{1,2}$/, ''); }
const CLUB_MOTS_GENERIQUES = new Set(['fc', 'ofc', 'afc', 'asc', 'ac', 'sc', 'csc', 'cs', 'us', 'uso', 'as', 'sa', 'sas', 'sr', 'srfa', 'ol', 'om', 'rc', 'fco', 'osc', 'sco', 'ent', 'entente', 'athletic', 'olympique', 'football', 'club', 'sporting', 'racing', 'stade', 'sur', 'sous', 'en', 'la', 'le', 'les', 'de', 'du', 'des']);
const CLUB_MOTS_REMPLACEMENT = { st: 'saint', ste: 'sainte', gd: 'grand', philibert: 'philbert', virois: 'vire', bayonnais: 'bayonne', briochin: 'brieuc', vfc: 'vendee', sbfc: 'beaucairois', alenconnaise: 'alencon', raph: 'raphael' };
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
  'co locmine saint': { mots: ['colomban', 'locmine', 'saint'], elargi: false },
  'angouleme chte': { mots: ['angouleme', 'charente'], elargi: false },
  'pf tarbes': { mots: ['pyrenees', 'tarbes'], elargi: false },
  'chateaubriant volt': { mots: ['voltigeurs', 'chateaubriant'], elargi: false },
  'associat grand ouest': { mots: ['grand', 'ouest', 'association', 'lyonnaise'], elargi: false },
  'berri chateauroux': { mots: ['lb', 'chateauroux'], elargi: false },
  'gfa rv': { mots: ['rumilly', 'vallieres'], elargi: false },
  'lyon duchere': { mots: ['lyon', 'duchere'], elargi: false },
};
const CLUB_PAIRES_DISTINCTES = new Set([
  ['apm metz', 'metz'].sort().join('|'),
  ['asptt dijon', 'dijon'].sort().join('|'),
]);
function clubWords(s) {
  const mots = normalizeClub(s).split(' ').filter(Boolean).map((w) => CLUB_MOTS_REMPLACEMENT[w] || w);
  let sansGeneriques = mots.filter((w) => !CLUB_MOTS_GENERIQUES.has(w));
  if (sansGeneriques.includes('hyeres')) sansGeneriques = sansGeneriques.filter((w) => w !== '83');
  return sansGeneriques.length ? sansGeneriques : mots;
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
function clubsCorrespondent(a, b) {
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

function estMajuscule(s) { return typeof s === 'string' && s.length > 0 && s === s.toUpperCase(); }
function ligneLegacy(r) { return estMajuscule(r.equipe_domicile) && estMajuscule(r.equipe_exterieur); }
function joursEcart(d1, d2) { return Math.abs((new Date(d1) - new Date(d2)) / 86400000); }
function equipesCorrespondent(legacy, canon) {
  return (clubsCorrespondent(legacy.equipe_domicile, canon.equipe_domicile) && clubsCorrespondent(legacy.equipe_exterieur, canon.equipe_exterieur))
    || (clubsCorrespondent(legacy.equipe_domicile, canon.equipe_exterieur) && clubsCorrespondent(legacy.equipe_exterieur, canon.equipe_domicile));
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

async function fetchMatchsJoueurParCalendrierIds(ids) {
  let toutes = [];
  for (let i = 0; i < ids.length; i += TAILLE_LOT) {
    const lot = ids.slice(i, i + TAILLE_LOT);
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data, error } = await supabase.from('matchs_joueur').select('id, joueur_id, calendrier_officiel_id').in('calendrier_officiel_id', lot).range(from, from + pageSize - 1);
      if (error) { console.error('Erreur lecture matchs_joueur :', error.message); process.exit(1); }
      toutes = toutes.concat(data);
      if (data.length < pageSize) break;
      from += pageSize;
    }
  }
  return toutes;
}

async function traiterCombo(division, groupe, calendrier) {
  const legacy = calendrier.filter(ligneLegacy);
  const canonique = calendrier.filter((r) => !ligneLegacy(r));
  if (!legacy.length || !canonique.length) return { paires: 0, rattaches: 0, supprimesMj: 0, ignores: 0, calendrierSupprimes: 0 };

  // Une ligne legacy déjà fusionnée avec succès par le script à date exacte
  // (corrige-doublons-calendrier-toutes-divisions.js) n'existe plus en base
  // (supprimée) : inutile de la ré-exclure ici. Il ne faut PAS exclure une
  // ligne legacy simplement parce qu'une ligne canonique quelconque (pour
  // d'autres équipes) partage sa date exacte par coïncidence — bug constaté
  // en pratique : la paire Fréjus/Saint-Priest (id 2244) était ignorée à
  // tort car une autre rencontre canonique tombait sur la même date.
  const paires = new Map(); // legacyId -> canoniqueId
  const ambigus = [];
  for (const l of legacy) {
    const candidats = canonique.filter((c) => joursEcart(c.date_match, l.date_match) <= TOLERANCE_JOURS && equipesCorrespondent(l, c));
    if (candidats.length === 1) paires.set(Number(l.id), Number(candidats[0].id));
    else if (candidats.length > 1) ambigus.push({ legacy: l, candidats });
  }
  if (!paires.size && !ambigus.length) return { paires: 0, rattaches: 0, supprimesMj: 0, ignores: 0, calendrierSupprimes: 0 };

  console.log(`\n=== ${division} groupe ${groupe} : ${paires.size} paire(s) legacy/canonique à date décalée ===`);
  for (const [legacyId, canonId] of paires) {
    const l = calendrier.find((r) => Number(r.id) === legacyId);
    const c = calendrier.find((r) => Number(r.id) === canonId);
    console.log(`  legacy id=${legacyId} (${l.date_match}) "${l.equipe_domicile}" vs "${l.equipe_exterieur}"  ->  canonique id=${canonId} (${c.date_match}) "${c.equipe_domicile}" vs "${c.equipe_exterieur}"`);
  }
  if (ambigus.length) {
    console.log(`  ${ambigus.length} ligne(s) legacy ignorée(s) par sécurité (plusieurs candidats canoniques) :`);
    for (const a of ambigus) console.log(`    id=${a.legacy.id} (${a.legacy.date_match}) "${a.legacy.equipe_domicile}" vs "${a.legacy.equipe_exterieur}" -> ${a.candidats.length} candidat(s) : ${a.candidats.map((c) => `id=${c.id}(${c.date_match})"${c.equipe_domicile}"vs"${c.equipe_exterieur}"`).join(', ')}`);
  }

  const legacyIds = [...paires.keys()];
  const matchs = await fetchMatchsJoueurParCalendrierIds(legacyIds);
  console.log(`  ${matchs.length} ligne(s) matchs_joueur pointent vers une ligne legacy appariée.`);

  const idsCanoniques = [...new Set([...paires.values()])];
  const mjCanon = await fetchMatchsJoueurParCalendrierIds(idsCanoniques);
  const joueursParCanoniqueId = new Map();
  for (const m of mjCanon) {
    const id = Number(m.calendrier_officiel_id);
    if (!joueursParCanoniqueId.has(id)) joueursParCanoniqueId.set(id, new Set());
    joueursParCanoniqueId.get(id).add(m.joueur_id);
  }

  let totalRattaches = 0, totalSupprimesMj = 0, totalIgnores = 0;
  for (const m of matchs) {
    const idCanon = paires.get(Number(m.calendrier_officiel_id));
    const dejaPresents = joueursParCanoniqueId.get(idCanon) || new Set();
    if (dejaPresents.has(m.joueur_id)) {
      totalSupprimesMj++;
      console.log(`    ${dryRun ? 'à supprimer' : 'suppression'} matchs_joueur id=${m.id} (doublon avec calendrier_officiel_id=${idCanon})`);
      if (!dryRun) {
        const { data, error } = await supabase.from('matchs_joueur').delete().eq('id', m.id).select('id');
        if (error) console.log(`      Erreur : ${error.message}`);
        else if (!data || !data.length) console.log(`      ATTENTION : suppression sans effet (0 ligne affectée) pour matchs_joueur id=${m.id}`);
      }
    } else {
      dejaPresents.add(m.joueur_id);
      joueursParCanoniqueId.set(idCanon, dejaPresents);
      totalRattaches++;
      if (!dryRun) {
        const { data, error } = await supabase.from('matchs_joueur').update({ calendrier_officiel_id: idCanon }).eq('id', m.id).select('id, calendrier_officiel_id');
        if (error) console.log(`      Erreur : ${error.message}`);
        else if (!data || !data.length) console.log(`      ATTENTION : mise à jour sans effet (0 ligne affectée) pour matchs_joueur id=${m.id}`);
        else if (Number(data[0].calendrier_officiel_id) !== idCanon) console.log(`      ATTENTION : valeur après écriture différente de la valeur demandée pour matchs_joueur id=${m.id}`);
      }
    }
  }
  console.log(`  Résumé matchs_joueur : ${totalRattaches} rattachement(s), ${totalSupprimesMj} suppression(s).`);

  console.log(`  Lignes calendrier legacy ${dryRun ? 'à supprimer' : 'supprimées'} : ${legacyIds.length}.`);
  let calendrierSupprimes = 0;
  if (!dryRun) {
    for (let i = 0; i < legacyIds.length; i += TAILLE_LOT) {
      const lot = legacyIds.slice(i, i + TAILLE_LOT);
      const { data, error } = await supabase.from('calendrier_officiel').delete().in('id', lot).select('id');
      if (error) console.log(`    Erreur suppression calendrier (lot ${lot.join(',')}) : ${error.message}`);
      else { console.log(`    Lot de ${lot.length} id(s) : ${data ? data.length : 0} ligne(s) réellement supprimée(s).`); calendrierSupprimes += data ? data.length : 0; }
    }
  }

  return { paires: paires.size, rattaches: totalRattaches, supprimesMj: totalSupprimesMj, ignores: ambigus.length, calendrierSupprimes };
}

const toutes = await fetchToutesPages('calendrier_officiel', 'id, division, groupe, equipe_domicile, equipe_exterieur, date_match', (q) => q.eq('saison', SAISON));
console.log(`${toutes.length} ligne(s) calendrier_officiel au total pour la saison ${SAISON}.`);

const parCombo = new Map();
for (const r of toutes) {
  const cle = `${r.division}::${r.groupe}`;
  if (!parCombo.has(cle)) parCombo.set(cle, { division: r.division, groupe: r.groupe, rows: [] });
  parCombo.get(cle).rows.push(r);
}

let totalPaires = 0, totalRattaches = 0, totalSupprimesMj = 0, totalIgnores = 0, totalCalendrierSupprimes = 0;
for (const { division, groupe, rows } of parCombo.values()) {
  const res = await traiterCombo(division, groupe, rows);
  totalPaires += res.paires;
  totalRattaches += res.rattaches;
  totalSupprimesMj += res.supprimesMj;
  totalIgnores += res.ignores;
  totalCalendrierSupprimes += res.calendrierSupprimes;
}

console.log(`\n=== TOTAL toutes divisions/groupes ===`);
console.log(`${totalPaires} paire(s) legacy/canonique à date décalée, ${totalRattaches} rattachement(s), ${totalSupprimesMj} suppression(s) matchs_joueur, ${totalIgnores} ligne(s) legacy ignorée(s) par sécurité, ${totalCalendrierSupprimes} ligne(s) calendrier ${dryRun ? 'à supprimer' : 'supprimée(s)'}.`);

if (dryRun) console.log('\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
