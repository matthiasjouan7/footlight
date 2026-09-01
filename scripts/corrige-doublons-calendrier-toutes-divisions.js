// Généralisation de corrige-doublons-groupe-c-abbreviations.js à TOUTES les
// divisions/groupes : diagnostic-doublons-calendrier-toutes-divisions.js a
// confirmé que les 12 groupes/divisions de la saison (N1 A/B/C, Ligue 3
// Unique, N2 A à H) ont le même défaut que National 1 groupe C (déjà
// corrigé) — une série "legacy" avec des noms d'équipe entièrement en
// MAJUSCULES et une série canonique à jour, pour les mêmes matchs réels aux
// mêmes dates (128 à 314 lignes en trop par groupe restant).
//
// Reprend exactement la même logique que le script groupe C (détection
// legacy = deux noms d'équipe intégralement en majuscules avec une ligne
// canonique à la même date ; rattachement des matchs_joueur par club du
// joueur via clubsCorrespondent ; suppression des lignes calendrier
// seulement si tous leurs matchs_joueur ont été résolus sans ambiguïté),
// mais bouclée sur chaque couple (division, groupe) trouvé en base au lieu
// d'être figée sur N1/C. Traiter à nouveau un groupe déjà propre (comme N1
// groupe C) est sans effet (idempotent).
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

// PostgREST plafonne chaque requête à 1000 lignes par défaut : un lot de 50
// ids calendrier peut référencer bien plus de 1000 lignes matchs_joueur au
// total, d'où la pagination par .range() EN PLUS du batching par id (voir
// historique groupe C : sans ça, le total restait figé à 5 lots × 1000).
async function fetchMatchsJoueurParCalendrierIds(ids) {
  let toutes = [];
  const TAILLE_LOT = 50;
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
  console.log(`\n=== ${division} groupe ${groupe} (${calendrier.length} ligne(s) calendrier) ===`);

  const parDate = new Map();
  for (const r of calendrier) {
    if (!parDate.has(r.date_match)) parDate.set(r.date_match, []);
    parDate.get(r.date_match).push(r);
  }

  const idsASupprimer = new Set();
  for (const [date, liste] of parDate) {
    const legacy = liste.filter(ligneLegacy);
    const canonique = liste.filter((r) => !ligneLegacy(r));
    if (!legacy.length) continue;
    if (!canonique.length) continue;
    legacy.forEach((r) => idsASupprimer.add(Number(r.id)));
  }
  if (!idsASupprimer.size) { console.log('  Rien à faire.'); return { rattaches: 0, supprimesMj: 0, ignores: 0, calendrierSupprimes: 0 }; }
  console.log(`  Lignes legacy à supprimer (référence canonique confirmée à la même date) : ${idsASupprimer.size}.`);

  const canoniqueParDate = new Map();
  for (const [date, liste] of parDate) canoniqueParDate.set(date, liste.filter((r) => !ligneLegacy(r)));
  const lignesParId = new Map(calendrier.map((r) => [Number(r.id), r]));

  const idsListe = [...idsASupprimer];
  const TAILLE_LOT = 50;
  const matchs = await fetchMatchsJoueurParCalendrierIds(idsListe);
  console.log(`  ${matchs.length} ligne(s) matchs_joueur pointent vers une ligne calendrier à supprimer.`);

  const joueurIds = [...new Set(matchs.map((m) => m.joueur_id))];
  let joueurs = [];
  for (let i = 0; i < joueurIds.length; i += TAILLE_LOT) {
    const lot = joueurIds.slice(i, i + TAILLE_LOT);
    const { data, error } = await supabase.from('joueurs').select('id, prenom, nom, club').in('id', lot);
    if (error) { console.error('Erreur lecture joueurs :', error.message); process.exit(1); }
    joueurs = joueurs.concat(data);
  }
  const clubParJoueur = new Map(joueurs.map((j) => [j.id, j.club]));
  const nomParJoueur = new Map(joueurs.map((j) => [j.id, `${j.prenom} ${j.nom}`]));

  const joueursParCanoniqueId = new Map();
  {
    const idsCanoniques = [...new Set([...canoniqueParDate.values()].flat().map((r) => Number(r.id)))];
    const mjCanon = await fetchMatchsJoueurParCalendrierIds(idsCanoniques);
    for (const m of mjCanon) {
      const id = Number(m.calendrier_officiel_id);
      if (!joueursParCanoniqueId.has(id)) joueursParCanoniqueId.set(id, new Set());
      joueursParCanoniqueId.get(id).add(m.joueur_id);
    }
  }

  const MAX_LIGNES_IGNOREES_AFFICHEES = 20;
  let totalRattaches = 0, totalSupprimesMj = 0, totalIgnores = 0;
  for (const m of matchs) {
    const ligneLegacyRow = lignesParId.get(Number(m.calendrier_officiel_id));
    const club = clubParJoueur.get(m.joueur_id);
    const nom = nomParJoueur.get(m.joueur_id) || m.joueur_id;
    if (!club) {
      if (totalIgnores < MAX_LIGNES_IGNOREES_AFFICHEES) console.log(`    Joueur ${m.joueur_id} introuvable — ignoré.`);
      totalIgnores++;
      continue;
    }
    const candidats = (canoniqueParDate.get(ligneLegacyRow.date_match) || []).filter((r) => clubsCorrespondent(r.equipe_domicile, club) || clubsCorrespondent(r.equipe_exterieur, club));
    if (candidats.length !== 1) {
      if (totalIgnores < MAX_LIGNES_IGNOREES_AFFICHEES) console.log(`    ${nom} (${club}) : ${candidats.length} ligne(s) canonique(s) trouvée(s) pour ${ligneLegacyRow.date_match} (attendu 1) — ignoré par sécurité.`);
      totalIgnores++;
      continue;
    }
    const idCanon = Number(candidats[0].id);
    const dejaPresents = joueursParCanoniqueId.get(idCanon) || new Set();
    if (dejaPresents.has(m.joueur_id)) {
      console.log(`    ${nom} (${club}) : ${dryRun ? 'à supprimer' : 'suppression'} matchs_joueur id=${m.id} (doublon avec calendrier_officiel_id=${idCanon})`);
      totalSupprimesMj++;
      if (!dryRun) {
        const { data, error } = await supabase.from('matchs_joueur').delete().eq('id', m.id).select('id');
        if (error) console.log(`      Erreur : ${error.message}`);
        else if (!data || !data.length) console.log(`      ATTENTION : suppression sans effet (0 ligne affectée) pour matchs_joueur id=${m.id}`);
      }
    } else {
      dejaPresents.add(m.joueur_id);
      joueursParCanoniqueId.set(idCanon, dejaPresents);
      console.log(`    ${nom} (${club}) : ${dryRun ? 'à rattacher' : 'rattachement'} matchs_joueur id=${m.id} → calendrier_officiel_id=${idCanon}`);
      totalRattaches++;
      if (!dryRun) {
        const { data, error } = await supabase.from('matchs_joueur').update({ calendrier_officiel_id: idCanon }).eq('id', m.id).select('id, calendrier_officiel_id');
        if (error) console.log(`      Erreur : ${error.message}`);
        else if (!data || !data.length) console.log(`      ATTENTION : mise à jour sans effet (0 ligne affectée) pour matchs_joueur id=${m.id}`);
        else if (Number(data[0].calendrier_officiel_id) !== idCanon) console.log(`      ATTENTION : valeur après écriture (${data[0].calendrier_officiel_id}) différente de la valeur demandée (${idCanon}) pour matchs_joueur id=${m.id}`);
      }
    }
  }
  if (totalIgnores > MAX_LIGNES_IGNOREES_AFFICHEES) console.log(`    ... ${totalIgnores - MAX_LIGNES_IGNOREES_AFFICHEES} autre(s) cas ignoré(s) par sécurité, non affiché(s) individuellement.`);
  console.log(`  Résumé matchs_joueur : ${totalRattaches} rattachement(s), ${totalSupprimesMj} suppression(s), ${totalIgnores} ignoré(s) par sécurité.`);

  const idsProblematiques = new Set();
  for (const m of matchs) {
    const club = clubParJoueur.get(m.joueur_id);
    const ligneLegacyRow = lignesParId.get(Number(m.calendrier_officiel_id));
    if (!club) { idsProblematiques.add(Number(m.calendrier_officiel_id)); continue; }
    const candidats = (canoniqueParDate.get(ligneLegacyRow.date_match) || []).filter((r) => clubsCorrespondent(r.equipe_domicile, club) || clubsCorrespondent(r.equipe_exterieur, club));
    if (candidats.length !== 1) idsProblematiques.add(Number(m.calendrier_officiel_id));
  }
  const idsASupprimerFinal = idsListe.filter((id) => !idsProblematiques.has(id));
  console.log(`  Lignes calendrier ${dryRun ? 'à supprimer' : 'supprimées'} : ${idsASupprimerFinal.length} sur ${idsASupprimer.size} (${idsProblematiques.size} gardée(s) car matchs_joueur non résolu(s) avec certitude).`);
  let calendrierSupprimes = 0;
  if (!dryRun) {
    for (let i = 0; i < idsASupprimerFinal.length; i += TAILLE_LOT) {
      const lot = idsASupprimerFinal.slice(i, i + TAILLE_LOT);
      const { data, error } = await supabase.from('calendrier_officiel').delete().in('id', lot).select('id');
      if (error) console.log(`    Erreur suppression calendrier (lot ${lot.join(',')}) : ${error.message}`);
      else { console.log(`    Lot de ${lot.length} id(s) : ${data ? data.length : 0} ligne(s) réellement supprimée(s).`); calendrierSupprimes += data ? data.length : 0; }
    }
  }

  return { rattaches: totalRattaches, supprimesMj: totalSupprimesMj, ignores: totalIgnores, calendrierSupprimes };
}

const toutes = await fetchToutesPages('calendrier_officiel', 'id, division, groupe, equipe_domicile, equipe_exterieur, date_match', (q) => q.eq('saison', SAISON));
console.log(`${toutes.length} ligne(s) calendrier_officiel au total pour la saison ${SAISON}.`);

const parCombo = new Map();
for (const r of toutes) {
  const cle = `${r.division}::${r.groupe}`;
  if (!parCombo.has(cle)) parCombo.set(cle, { division: r.division, groupe: r.groupe, rows: [] });
  parCombo.get(cle).rows.push(r);
}

let totalRattaches = 0, totalSupprimesMj = 0, totalIgnores = 0, totalCalendrierSupprimes = 0;
for (const { division, groupe, rows } of parCombo.values()) {
  const res = await traiterCombo(division, groupe, rows);
  totalRattaches += res.rattaches;
  totalSupprimesMj += res.supprimesMj;
  totalIgnores += res.ignores;
  totalCalendrierSupprimes += res.calendrierSupprimes;
}

console.log(`\n=== TOTAL toutes divisions/groupes ===`);
console.log(`${totalRattaches} rattachement(s), ${totalSupprimesMj} suppression(s) matchs_joueur, ${totalIgnores} ignoré(s) par sécurité, ${totalCalendrierSupprimes} ligne(s) calendrier ${dryRun ? 'à supprimer' : 'supprimée(s)'}.`);

if (dryRun) console.log('\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
