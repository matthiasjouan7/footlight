// Le diagnostic proactif (diagnostic-doublons-club-toutes-divisions.js) a
// signalé 28 journées "suspectes" (plus de lignes que la norme du groupe)
// dans toutes les divisions. Une partie de ces journées en trop sont déjà
// reconnues comme des DOUBLONS CONFIRMÉS par le moteur de rapprochement de
// PRODUCTION (sync-lequipe-to-calendrier.js — synonymes Fosseenne,
// Beaucaire, etc. déjà déployés, ou simplement 2 graphies du même club :
// "AS CANNES" (série legacy tout-majuscules) / "Cannes" (série lequipe.fr
// à jour)) mais n'ont jamais été fusionnées, car la vérification
// "déjà existant" se faisait par DATE EXACTE (souvent différente entre les
// 2 séries) et non par journée.
//
// Ce script ne fait AUCUNE hypothèse nouvelle : il réutilise VERBATIM le
// moteur de clubsCorrespondent de sync-lequipe-to-calendrier.js. Pour
// chaque journée en trop, ne fusionne QUE les paires où les 2 équipes
// (domicile ET extérieur) sont reconnues comme correspondantes des DEUX
// côtés — donc déjà un "vrai" doublon aux yeux du code de production,
// jamais un cas ambigu. Les paires ambiguës ("Suspect", un seul des 2 noms
// se recoupe) ou clairement différentes ne sont PAS touchées.
//
// Choix de la ligne à conserver, dans cet ordre :
//   1) si une seule des 2 lignes a ses 2 noms d'équipe entièrement en
//      MAJUSCULES (série legacy connue), elle est supprimée au profit de
//      l'autre (même convention que corrige-doublons-calendrier-toutes-divisions.js) ;
//   2) sinon, celle qui a le plus de matchs_joueur déjà rattachés est
//      conservée ;
//   3) sinon, l'id le plus bas (ligne la plus ancienne) est conservé.
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

// ---- Moteur de rapprochement club, copié VERBATIM de sync-lequipe-to-calendrier.js ----
function normalizeName(s) { return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' '); }
function normalizeClub(s) { return normalizeName(s).replace(/[.'/-]/g, ' ').replace(/\s+/g, ' ').trim().replace(/\s\d{1,2}$/, ''); }
const CLUB_MOTS_GENERIQUES = new Set([
  'fc', 'ofc', 'afc', 'asc', 'ac', 'sc', 'csc', 'cs', 'us', 'uso', 'as', 'sa', 'sas',
  'sr', 'srfa', 'ol', 'om', 'rc',
  'fco', 'osc', 'sco', 'ent', 'entente', 'athletic', 'olympique', 'football', 'club',
  'sporting', 'racing', 'stade',
  'sur', 'sous', 'en', 'la', 'le', 'les', 'de', 'du', 'des',
  'af', 'aj', 'd', 'may', 'losc', 'lorraine', 'montb', 'alsace', 'hsc', 'berri',
]);
const CLUB_MOTS_REMPLACEMENT = {
  st: 'saint', ste: 'sainte', gd: 'grand', philibert: 'philbert',
  virois: 'vire', bayonnais: 'bayonne', briochin: 'brieuc', vfc: 'vendee', sbfc: 'beaucairois',
  alenconnaise: 'alencon', raph: 'raphael',
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
  'co locmine saint': { mots: ['colomban', 'locmine', 'saint'], elargi: false },
  'angouleme chte': { mots: ['angouleme', 'charente'], elargi: false },
  'pf tarbes': { mots: ['pyrenees', 'tarbes'], elargi: false },
  'chateaubriant volt': { mots: ['voltigeurs', 'chateaubriant'], elargi: false },
  'associat grand ouest': { mots: ['grand', 'ouest', 'association', 'lyonnaise'], elargi: false },
  'ajaccio gfc': { mots: ['ajaccio', 'gazelec'], elargi: false },
  'gfa rv': { mots: ['rumilly', 'vallieres'], elargi: false },
  'et fosseenne s': { mots: ['fos', 'mer'], elargi: false },
  beaucairois: { mots: ['beaucaire'], elargi: false },
};
const CLUB_PAIRES_DISTINCTES = new Set([
  ['apm metz', 'metz'].sort().join('|'),
  ['asptt dijon', 'dijon'].sort().join('|'),
]);
function clubWords(s) {
  const mots = normalizeClub(s).split(' ').filter(Boolean);
  const remplaces = mots.map((w) => CLUB_MOTS_REMPLACEMENT[w] || w);
  const sansCodesDepartement = remplaces.filter((w) => !/^\d{1,3}$/.test(w));
  const sansGeneriques = sansCodesDepartement.filter((w) => !CLUB_MOTS_GENERIQUES.has(w));
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
function motsProches(a, b) {
  if (a === b) return true;
  const [court, long] = a.length <= b.length ? [a, b] : [b, a];
  return court.length >= 4 && long.startsWith(court);
}
function clubsCorrespondent(a, b) {
  const sigA = clubIdentitySignature(a), sigB = clubIdentitySignature(b);
  if (sigA && sigB && sigA === sigB) return true;
  if (sigA && sigB && CLUB_PAIRES_DISTINCTES.has([sigA, sigB].sort().join('|'))) return false;
  const wa = clubWordsElargi(a), wb = clubWordsElargi(b);
  if (!wa.length || !wb.length) return false;
  const [small, big] = wa.length <= wb.length ? [wa, wb] : [wb, wa];
  for (const w of small) if (!big.some((w2) => motsProches(w, w2))) return false;
  return true;
}
// ------------------------------------------------------------------------

function estMajuscule(s) { return typeof s === 'string' && s.length > 0 && s === s.toUpperCase(); }
function ligneToutMajuscule(r) { return estMajuscule(r.equipe_domicile) && estMajuscule(r.equipe_exterieur); }

async function fetchAll(select, filtreFn) {
  let all = [];
  for (let from = 0; ; from += 1000) {
    let q = supabase.from('calendrier_officiel').select(select).eq('saison', SAISON).range(from, from + 999);
    if (filtreFn) q = filtreFn(q);
    const { data, error } = await q;
    if (error) { console.error('Erreur lecture :', error.message); process.exit(1); }
    if (!data || !data.length) break;
    all = all.concat(data);
    if (data.length < 1000) break;
  }
  return all;
}

async function compterMatchsJoueur(id) {
  const { count, error } = await supabase.from('matchs_joueur').select('id', { count: 'exact', head: true }).eq('calendrier_officiel_id', id);
  if (error) { console.log(`    Erreur comptage matchs_joueur id=${id} : ${error.message}`); return 0; }
  return count || 0;
}

const tout = await fetchAll('id, division, groupe, journee, date_match, equipe_domicile, equipe_exterieur');
console.log(`${tout.length} ligne(s) calendrier_officiel au total (saison ${SAISON}).\n`);

const parGroupe = new Map();
for (const m of tout) {
  const cle = `${m.division || '?'} ${m.groupe || '?'}`;
  if (!parGroupe.has(cle)) parGroupe.set(cle, []);
  parGroupe.get(cle).push(m);
}

let totalPairesFusionnees = 0, totalRattaches = 0, totalSupprimesMj = 0, totalCalendrierSupprimes = 0;

for (const [cle, matchs] of [...parGroupe.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  const parJournee = new Map();
  for (const m of matchs) {
    if (m.journee == null) continue;
    if (!parJournee.has(m.journee)) parJournee.set(m.journee, []);
    parJournee.get(m.journee).push(m);
  }
  if (parJournee.size < 3) continue;
  const comptes = [...parJournee.values()].map((v) => v.length);
  const frequence = new Map();
  for (const c of comptes) frequence.set(c, (frequence.get(c) || 0) + 1);
  const norme = [...frequence.entries()].sort((a, b) => b[1] - a[1])[0][0];

  const journeesSuspectes = [...parJournee.entries()].filter(([, v]) => v.length > norme);
  if (!journeesSuspectes.length) continue;

  for (const [journee, rows] of journeesSuspectes.sort((a, b) => a[0] - b[0])) {
    // Fusionne itérativement toutes les paires pleinement confirmées de cette journée.
    let restantes = [...rows];
    let progresse = true;
    while (progresse) {
      progresse = false;
      outer:
      for (let i = 0; i < restantes.length; i++) {
        for (let j = i + 1; j < restantes.length; j++) {
          const a = restantes[i], b = restantes[j];
          const domMatch = clubsCorrespondent(a.equipe_domicile, b.equipe_domicile) || clubsCorrespondent(a.equipe_domicile, b.equipe_exterieur);
          const extMatch = clubsCorrespondent(a.equipe_exterieur, b.equipe_domicile) || clubsCorrespondent(a.equipe_exterieur, b.equipe_exterieur);
          if (!(domMatch && extMatch)) continue;

          // Doublon confirmé des 2 côtés par le moteur de production. Choisit la ligne à garder.
          const aMaj = ligneToutMajuscule(a), bMaj = ligneToutMajuscule(b);
          let garder, doublon;
          if (aMaj !== bMaj) {
            garder = aMaj ? b : a;
            doublon = aMaj ? a : b;
          } else {
            const nbA = await compterMatchsJoueur(a.id);
            const nbB = await compterMatchsJoueur(b.id);
            if (nbA !== nbB) { garder = nbA > nbB ? a : b; doublon = nbA > nbB ? b : a; }
            else { garder = a.id < b.id ? a : b; doublon = a.id < b.id ? b : a; }
          }

          console.log(`\n${cle} journée ${journee} : doublon confirmé — id=${garder.id} "${garder.equipe_domicile}" vs "${garder.equipe_exterieur}" (${garder.date_match}) [conservé] / id=${doublon.id} "${doublon.equipe_domicile}" vs "${doublon.equipe_exterieur}" (${doublon.date_match}) [doublon]`);

          const { data: mjDoublon, error: errMj } = await supabase.from('matchs_joueur').select('id, joueur_id').eq('calendrier_officiel_id', doublon.id);
          if (errMj) { console.log(`  Erreur lecture matchs_joueur doublon : ${errMj.message}`); continue; }
          const { data: mjCanon, error: errMj2 } = await supabase.from('matchs_joueur').select('id, joueur_id').eq('calendrier_officiel_id', garder.id);
          if (errMj2) { console.log(`  Erreur lecture matchs_joueur canonique : ${errMj2.message}`); continue; }
          const joueursDejaPresents = new Set((mjCanon || []).map((m) => m.joueur_id));

          console.log(`  ${mjDoublon.length} ligne(s) matchs_joueur sur la ligne doublon (id=${doublon.id}).`);
          for (const m of mjDoublon) {
            if (joueursDejaPresents.has(m.joueur_id)) {
              console.log(`    Joueur ${m.joueur_id} : déjà présent — ${dryRun ? 'à supprimer' : 'suppression'} matchs_joueur id=${m.id}.`);
              totalSupprimesMj++;
              if (!dryRun) {
                const { error } = await supabase.from('matchs_joueur').delete().eq('id', m.id);
                if (error) console.log(`      Erreur : ${error.message}`);
              }
            } else {
              console.log(`    Joueur ${m.joueur_id} : ${dryRun ? 'à rattacher' : 'rattachement'} matchs_joueur id=${m.id} → calendrier_officiel_id=${garder.id}.`);
              joueursDejaPresents.add(m.joueur_id);
              totalRattaches++;
              if (!dryRun) {
                const { error } = await supabase.from('matchs_joueur').update({ calendrier_officiel_id: garder.id }).eq('id', m.id);
                if (error) console.log(`      Erreur : ${error.message}`);
              }
            }
          }

          console.log(`  Ligne calendrier doublon id=${doublon.id} : ${dryRun ? 'à supprimer' : 'suppression'}.`);
          totalCalendrierSupprimes++;
          if (!dryRun) {
            const { error } = await supabase.from('calendrier_officiel').delete().eq('id', doublon.id);
            if (error) console.log(`    Erreur suppression calendrier : ${error.message}`);
          }
          totalPairesFusionnees++;

          restantes = restantes.filter((r) => r.id !== doublon.id);
          progresse = true;
          break outer;
        }
      }
    }
  }
}

console.log(`\n=== TOTAL toutes divisions ===`);
console.log(`${totalPairesFusionnees} paire(s) fusionnée(s), ${totalRattaches} rattachement(s) matchs_joueur, ${totalSupprimesMj} suppression(s) matchs_joueur (déjà présents), ${totalCalendrierSupprimes} ligne(s) calendrier ${dryRun ? 'à supprimer' : 'supprimée(s)'}.`);
if (dryRun) console.log('\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
