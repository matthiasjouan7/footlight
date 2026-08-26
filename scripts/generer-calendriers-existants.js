// Rattrapage pour les joueurs déjà inscrits avant la génération
// automatique du calendrier (voir footlight-modifier-profil.html /
// footlight-inscription-joueur.html) : reproduit fidèlement la même
// logique de rapprochement club ("Générer mon calendrier") pour CHAQUE
// couple (club, niveau, saison) déjà en base — la saison courante de
// chaque joueur (table joueurs) ET ses saisons historiques (table
// stats_saisons) — et insère les matchs correspondants dans
// matchs_joueur quand le rapprochement est non ambigu.
//
// Ne touche jamais aux stats agrégées (buts, matchs_joues...) : ajoute
// uniquement des lignes matchs_joueur (calendrier), comme le ferait le
// joueur lui-même en cliquant sur le bouton.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);

const supabase = createClient(supabaseUrl, supabaseKey);

// ── Copie fidèle de footlight-modifier-profil.html (rapprochement club) ──
function normalizeName(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}
function normalizeClub(s) {
  return normalizeName(s).replace(/[.'/-]/g, ' ').replace(/\s+/g, ' ').trim().replace(/\s\d{1,2}$/, '');
}
const CLUB_MOTS_GENERIQUES = new Set([
  'fc','ofc','afc','asc','ac','sc','csc','cs','us','uso','as','sa','sas',
  'sr','srfa','ol','om','rc',
  'fco','osc','sco','ent','entente','athletic','olympique','football','club',
  'sporting','racing','stade',
  'sur','sous','en','la','le','les','de','du','des',
]);
const CLUB_MOTS_REMPLACEMENT = {
  st: 'saint', ste: 'sainte', gd: 'grand', philibert: 'philbert',
  virois: 'vire', bayonnais: 'bayonne', briochin: 'brieuc', vfc: 'vendee',
  sbfc: 'beaucairois',
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
};
// Paires de clubs réels distincts dont les signatures se recoupent par
// sous-ensemble (un des deux, réduit à son seul nom de ville, devient un
// sous-ensemble strict de l'autre) et que clubWordsMatch confondrait à
// tort sans cette exclusion explicite. Clés : les deux signatures
// (clubIdentitySignature) triées et jointes par "|".
const CLUB_PAIRES_DISTINCTES = new Set([
  // "Metz Apm Fc" (APM Metz) et "Fc Metz 2" (réserve du FC Metz pro) :
  // deux clubs réels différents qui se rencontrent même en championnat.
  ['apm metz', 'metz'].sort().join('|'),
  // "Dijon Fco" (réserve) et "Asptt Dijon" : deux clubs réels différents.
  ['asptt dijon', 'dijon'].sort().join('|'),
]);
function clubWords(s) {
  const mots = normalizeClub(s).split(' ').filter(Boolean);
  const remplaces = mots.map((w) => CLUB_MOTS_REMPLACEMENT[w] || w);
  let sansGeneriques = remplaces.filter((w) => !CLUB_MOTS_GENERIQUES.has(w));
  // "Hyères 83 FC" : certains joueurs incluent le département dans le nom
  // de club, absent du nom officiel ("HYERES F.C.") — retire ce token
  // précis pour ce club seulement (uniquement si "hyeres" est déjà
  // présent), pour ne pas risquer de supprimer un numéro de département
  // qui distinguerait deux clubs réels différents ailleurs.
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

async function selectAll(table, columns) {
  const pageSize = 1000;
  let toutes = [];
  let page = 0;
  for (;;) {
    const { data, error } = await supabase.from(table).select(columns).range(page * pageSize, page * pageSize + pageSize - 1);
    if (error) { console.error(`Erreur lecture ${table} :`, error.message); process.exit(1); }
    toutes = toutes.concat(data || []);
    if (!data || data.length < pageSize) break;
    page++;
  }
  return toutes;
}

console.log('Lecture des données (joueurs, stats_saisons, calendrier_officiel, matchs_joueur)...');
const joueurs = await selectAll('joueurs', 'id, prenom, nom, club, niveau, saison');
const saisonsHisto = await selectAll('stats_saisons', 'joueur_id, club, niveau, saison');
const calendrier = await selectAll('calendrier_officiel', 'id, saison, division, equipe_domicile, equipe_exterieur, date_match');
const matchsExistants = await selectAll('matchs_joueur', 'joueur_id, saison, date_match, calendrier_officiel_id');

// Une entrée par (joueur_id, club, niveau, saison) à traiter : la saison
// courante du joueur, plus chacune de ses saisons historiques.
const nomJoueur = new Map(joueurs.map((j) => [j.id, `${j.prenom} ${j.nom}`]));
const cibles = [];
for (const j of joueurs) {
  if (j.club && j.niveau && j.saison) cibles.push({ joueur_id: j.id, club: j.club, niveau: j.niveau, saison: j.saison });
}
for (const s of saisonsHisto) {
  if (s.club && s.niveau && s.saison) cibles.push({ joueur_id: s.joueur_id, club: s.club, niveau: s.niveau, saison: s.saison });
}
console.log(`${cibles.length} couple(s) (joueur, saison) avec club+niveau renseignés à traiter.\n`);

const existantsParJoueur = new Map();
for (const m of matchsExistants) {
  if (!existantsParJoueur.has(m.joueur_id)) existantsParJoueur.set(m.joueur_id, []);
  existantsParJoueur.get(m.joueur_id).push(m);
}

let totalAInserer = [];
let nbOk = 0, nbAmbigu = 0, nbSansMatch = 0;
const exemplesAmbigus = [];
const exemplesSansMatch = [];

for (const cible of cibles) {
  const diviserParNiveau = ['N1', 'N2', 'Ligue 3'].includes(cible.niveau);
  const pool = calendrier.filter((row) => row.saison === cible.saison && (!diviserParNiveau || row.division === cible.niveau));

  const matchsClub = pool.filter((row) => clubWordsMatch(row.equipe_domicile, cible.club) || clubWordsMatch(row.equipe_exterieur, cible.club));
  if (!matchsClub.length) {
    nbSansMatch++;
    if (exemplesSansMatch.length < 15) exemplesSansMatch.push(`${nomJoueur.get(cible.joueur_id)} — "${cible.club}" (${cible.niveau}, ${cible.saison})`);
    continue;
  }

  const rencontres = new Map();
  matchsClub.forEach((row) => {
    if (clubWordsMatch(row.equipe_domicile, cible.club)) rencontres.set(clubIdentitySignature(row.equipe_domicile) + '|' + row.division, row.equipe_domicile);
    if (clubWordsMatch(row.equipe_exterieur, cible.club)) rencontres.set(clubIdentitySignature(row.equipe_exterieur) + '|' + row.division, row.equipe_exterieur);
  });
  if (rencontres.size > 1) {
    nbAmbigu++;
    if (exemplesAmbigus.length < 15) exemplesAmbigus.push(`${nomJoueur.get(cible.joueur_id)} — "${cible.club}" (${cible.niveau}, ${cible.saison}) : ${[...rencontres.values()].join(', ')}`);
    continue;
  }

  const existants = existantsParJoueur.get(cible.joueur_id) || [];
  const idsExistants = new Set(existants.filter((m) => m.calendrier_officiel_id).map((m) => String(m.calendrier_officiel_id)));
  const datesExistantes = new Set(existants.filter((m) => m.saison === cible.saison && m.date_match).map((m) => m.date_match));

  const aInserer = matchsClub.filter((row) => !idsExistants.has(String(row.id)) && !datesExistantes.has(row.date_match)).map((row) => {
    const domicile = clubWordsMatch(row.equipe_domicile, cible.club);
    return {
      joueur_id: cible.joueur_id,
      saison: cible.saison,
      date_match: row.date_match,
      adversaire: domicile ? row.equipe_exterieur : row.equipe_domicile,
      competition: 'championnat',
      domicile,
      verifie: true,
      calendrier_officiel_id: row.id,
    };
  });

  if (aInserer.length) {
    nbOk++;
    totalAInserer = totalAInserer.concat(aInserer);
  }
}

console.log(`OK (matchs à générer) : ${nbOk} couple(s) joueur/saison`);
console.log(`Ambigu (plusieurs clubs correspondent, ignoré) : ${nbAmbigu} couple(s)`);
if (exemplesAmbigus.length) console.log('  ex: ' + exemplesAmbigus.join('\n      '));
console.log(`Sans correspondance dans le calendrier officiel : ${nbSansMatch} couple(s)`);
if (exemplesSansMatch.length) console.log('  ex: ' + exemplesSansMatch.join('\n      '));
console.log(`\n${totalAInserer.length} match(s) au total à insérer dans matchs_joueur.`);

if (!dryRun) {
  const TAILLE_LOT = 500;
  for (let i = 0; i < totalAInserer.length; i += TAILLE_LOT) {
    const lot = totalAInserer.slice(i, i + TAILLE_LOT);
    const { error: insErr } = await supabase.from('matchs_joueur').insert(lot);
    if (insErr) { console.error(`Erreur insertion (lot ${i}-${i + lot.length}) :`, insErr.message); process.exit(1); }
  }
  console.log('\nTerminé.');
} else {
  console.log('\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour appliquer réellement.');
}
