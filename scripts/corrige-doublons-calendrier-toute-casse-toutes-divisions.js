// Généralisation des deux scripts de fusion précédents
// (corrige-doublons-calendrier-toutes-divisions.js : date exacte, style
// legacy tout-capitales uniquement ; sa variante à date décalée : idem).
// Découvert via diagnostic-doublons-lorient-chateaubriant.js : la paire
// id=3396 ("Lorient B" vs "Chauray") / id=245 ("FC LORIENT 2" vs
// "FC Chauray") duplique la même rencontre à un jour d'écart, mais AUCUNE
// des deux lignes n'est en style tout-capitales — condition requise par les
// deux scripts précédents pour repérer un doublon — donc jamais fusionnée.
//
// Ce script ne présuppose plus qu'un des deux styles est "la référence" :
// pour chaque paire de lignes calendrier du même groupe, à équipes
// équivalentes et à au plus TOLERANCE_JOURS jours d'écart (0 inclus, pour
// couvrir aussi les doublons à date strictement identique ratés par
// l'autre script), la ligne à GARDER est celle qui a déjà le plus de
// matchs_joueur avec des minutes renseignées (donc la plus avancée dans sa
// synchronisation) ; l'autre est fusionnée dedans (matchs_joueur redirigés,
// ou supprimés si le joueur a déjà une ligne sur la ligne gardée), puis
// supprimée si tous ses matchs_joueur ont été résolus sans ambiguïté.
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
  'touraine uf': { mots: ['union', 'foot', 'touraine'], elargi: false },
  fcldsd: { mots: ['limonest'], elargi: false },
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
function joursEcart(d1, d2) { return Math.abs((new Date(d1) - new Date(d2)) / 86400000); }
function equipesCorrespondent(a, b) {
  return (clubsCorrespondent(a.equipe_domicile, b.equipe_domicile) && clubsCorrespondent(a.equipe_exterieur, b.equipe_exterieur))
    || (clubsCorrespondent(a.equipe_domicile, b.equipe_exterieur) && clubsCorrespondent(a.equipe_exterieur, b.equipe_domicile));
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
      const { data, error } = await supabase.from('matchs_joueur').select('id, joueur_id, calendrier_officiel_id, minutes_jouees').in('calendrier_officiel_id', lot).range(from, from + pageSize - 1);
      if (error) { console.error('Erreur lecture matchs_joueur :', error.message); process.exit(1); }
      toutes = toutes.concat(data);
      if (data.length < pageSize) break;
      from += pageSize;
    }
  }
  return toutes;
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
  // Paires candidates : deux lignes distinctes, mêmes équipes, écart de date <= TOLERANCE_JOURS.
  const traitees = new Set();
  const paires = new Map(); // idPerdant -> idGagnant
  const ambigus = [];
  for (let i = 0; i < rows.length; i++) {
    const a = rows[i];
    if (traitees.has(a.id)) continue;
    const candidats = rows.filter((b) => b.id !== a.id && !traitees.has(b.id) && joursEcart(a.date_match, b.date_match) <= TOLERANCE_JOURS && equipesCorrespondent(a, b));
    if (candidats.length === 1) {
      const b = candidats[0];
      traitees.add(a.id);
      traitees.add(b.id);
      paires.set(Number(a.id), Number(b.id)); // résolu ci-dessous (lequel garder)
    } else if (candidats.length > 1) {
      ambigus.push({ ligne: a, candidats });
    }
  }
  if (!paires.size && !ambigus.length) continue;

  // Détermine, pour chaque paire, laquelle garder (le plus de matchs_joueur
  // avec minutes renseignées = la plus avancée dans sa synchronisation).
  const idsEnJeu = [...new Set([...paires.keys(), ...paires.values()])];
  const mjEnJeu = await fetchMatchsJoueurParCalendrierIds(idsEnJeu);
  const statsParId = new Map();
  for (const id of idsEnJeu) statsParId.set(id, { total: 0, avecMinutes: 0 });
  for (const m of mjEnJeu) {
    const id = Number(m.calendrier_officiel_id);
    const s = statsParId.get(id);
    if (!s) continue;
    s.total++;
    if (m.minutes_jouees != null) s.avecMinutes++;
  }

  const decisions = new Map(); // idPerdant -> idGagnant
  for (const [idA, idB] of paires) {
    const sA = statsParId.get(idA) || { avecMinutes: 0, total: 0 };
    const sB = statsParId.get(idB) || { avecMinutes: 0, total: 0 };
    let gagnant, perdant;
    if (sA.avecMinutes !== sB.avecMinutes) { [gagnant, perdant] = sA.avecMinutes > sB.avecMinutes ? [idA, idB] : [idB, idA]; }
    else if (sA.total !== sB.total) { [gagnant, perdant] = sA.total > sB.total ? [idA, idB] : [idB, idA]; }
    else { [gagnant, perdant] = idA < idB ? [idA, idB] : [idB, idA]; } // stable, arbitraire si vraiment identique
    decisions.set(perdant, gagnant);
  }

  if (!decisions.size && !ambigus.length) continue;
  console.log(`\n=== ${division} groupe ${groupe} : ${decisions.size} paire(s) doublon (toute casse) ===`);
  for (const [perdantId, gagnantId] of decisions) {
    const p = rows.find((r) => Number(r.id) === perdantId);
    const g = rows.find((r) => Number(r.id) === gagnantId);
    const sp = statsParId.get(perdantId), sg = statsParId.get(gagnantId);
    console.log(`  perdant id=${perdantId} (${p.date_match}) "${p.equipe_domicile}" vs "${p.equipe_exterieur}" [${sp.avecMinutes}/${sp.total} avec minutes]  ->  gagnant id=${gagnantId} (${g.date_match}) "${g.equipe_domicile}" vs "${g.equipe_exterieur}" [${sg.avecMinutes}/${sg.total} avec minutes]`);
  }
  if (ambigus.length) {
    console.log(`  ${ambigus.length} ligne(s) ignorée(s) par sécurité (plusieurs candidats) :`);
    for (const a of ambigus.slice(0, 20)) console.log(`    id=${a.ligne.id} (${a.ligne.date_match}) "${a.ligne.equipe_domicile}" vs "${a.ligne.equipe_exterieur}" -> ${a.candidats.length} candidat(s) : ${a.candidats.map((c) => `id=${c.id}(${c.date_match})"${c.equipe_domicile}"vs"${c.equipe_exterieur}"`).join(', ')}`);
    if (ambigus.length > 20) console.log(`    ... ${ambigus.length - 20} autre(s) ignoré(s).`);
  }

  const perdantIds = [...decisions.keys()];
  const matchsPerdants = await fetchMatchsJoueurParCalendrierIds(perdantIds);
  console.log(`  ${matchsPerdants.length} ligne(s) matchs_joueur pointent vers une ligne perdante.`);

  const gagnantIds = [...new Set([...decisions.values()])];
  const mjGagnants = await fetchMatchsJoueurParCalendrierIds(gagnantIds);
  const joueursParGagnantId = new Map();
  for (const m of mjGagnants) {
    const id = Number(m.calendrier_officiel_id);
    if (!joueursParGagnantId.has(id)) joueursParGagnantId.set(id, new Set());
    joueursParGagnantId.get(id).add(m.joueur_id);
  }

  let rattaches = 0, supprimesMj = 0;
  for (const m of matchsPerdants) {
    const idGagnant = decisions.get(Number(m.calendrier_officiel_id));
    const dejaPresents = joueursParGagnantId.get(idGagnant) || new Set();
    if (dejaPresents.has(m.joueur_id)) {
      supprimesMj++;
      console.log(`    ${dryRun ? 'à supprimer' : 'suppression'} matchs_joueur id=${m.id} (doublon avec calendrier_officiel_id=${idGagnant})`);
      if (!dryRun) {
        const { data, error } = await supabase.from('matchs_joueur').delete().eq('id', m.id).select('id');
        if (error) console.log(`      Erreur : ${error.message}`);
      }
    } else {
      dejaPresents.add(m.joueur_id);
      joueursParGagnantId.set(idGagnant, dejaPresents);
      rattaches++;
      if (!dryRun) {
        const { data, error } = await supabase.from('matchs_joueur').update({ calendrier_officiel_id: idGagnant }).eq('id', m.id).select('id');
        if (error) console.log(`      Erreur : ${error.message}`);
      }
    }
  }
  console.log(`  Résumé matchs_joueur : ${rattaches} rattachement(s), ${supprimesMj} suppression(s).`);

  console.log(`  Lignes calendrier perdantes ${dryRun ? 'à supprimer' : 'supprimées'} : ${perdantIds.length}.`);
  let calendrierSupprimes = 0;
  if (!dryRun) {
    for (let i = 0; i < perdantIds.length; i += TAILLE_LOT) {
      const lot = perdantIds.slice(i, i + TAILLE_LOT);
      const { data, error } = await supabase.from('calendrier_officiel').delete().in('id', lot).select('id');
      if (error) console.log(`    Erreur suppression calendrier (lot ${lot.join(',')}) : ${error.message}`);
      else { console.log(`    Lot de ${lot.length} id(s) : ${data ? data.length : 0} ligne(s) réellement supprimée(s).`); calendrierSupprimes += data ? data.length : 0; }
    }
  }

  totalPaires += decisions.size;
  totalRattaches += rattaches;
  totalSupprimesMj += supprimesMj;
  totalIgnores += ambigus.length;
  totalCalendrierSupprimes += calendrierSupprimes;
}

console.log(`\n=== TOTAL toutes divisions/groupes ===`);
console.log(`${totalPaires} paire(s) doublon (toute casse), ${totalRattaches} rattachement(s), ${totalSupprimesMj} suppression(s) matchs_joueur, ${totalIgnores} ligne(s) ignorée(s) par sécurité, ${totalCalendrierSupprimes} ligne(s) calendrier ${dryRun ? 'à supprimer' : 'supprimée(s)'}.`);

if (dryRun) console.log('\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
