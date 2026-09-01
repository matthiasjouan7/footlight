// Nettoie en masse les paires ambiguës détectées par
// scan-ambiguites-calendrier.js pour une division (DIVISION, "N1" par
// défaut) : dans chaque cas, une ligne "orpheline" au nom raccourci (1-2
// matchs) duplique le même match qu'une ligne "officielle" complète (24-34
// matchs) — exactement le même bug que Lorient B / Saint-Brieuc / Bayonne /
// Les Herbiers / Locminé déjà corrigés en N1. Généralisé à toutes les
// divisions (N1, N2, Ligue 3) une fois confirmé que le bug provenait de
// sync-lequipe-to-calendrier.js (rapprochement club trop faible), qui
// touchait les 3 de la même façon.
//
// Pour chaque paire, la ligne avec le MOINS de matchs (parmi les deux
// candidats) est traitée comme orpheline à absorber dans celle qui en a le
// PLUS (référence). Un garde-fou refuse toute paire où les deux comptes
// sont proches (écart < 5x) — signe possible de deux clubs réels distincts
// (comme "Dijon Fco 2" / "Asptt Dijon 1" en N2, volontairement exclus de ce
// script) plutôt qu'un doublon, pour éviter de fusionner par erreur.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const DIVISION = process.env.DIVISION || 'N1';
const SAISON = process.env.SAISON || '2026-2027';
const RATIO_MIN_SURETE = 5; // n'agit que si la référence a ≥ 5x plus de matchs que l'orpheline

// ── Copie fidèle de generer-calendriers-existants.js ──
function normalizeName(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}
function normalizeClub(s) {
  return normalizeName(s).replace(/[.'/-]/g, ' ').replace(/\s+/g, ' ').trim().replace(/\s\d{1,2}$/, '');
}
const CLUB_MOTS_GENERIQUES = new Set([
  'fc','ofc','afc','asc','ac','sc','csc','cs','us','uso','as','ol','om','rc',
  'fco','osc','sco','ent','entente','athletic','olympique','football','club',
  'sporting','racing','stade',
  'sur','sous','en','la','le','les','de','du','des',
]);
const CLUB_MOTS_REMPLACEMENT = {
  st: 'saint', ste: 'sainte', gd: 'grand', philibert: 'philbert',
  virois: 'vire', bayonnais: 'bayonne', briochin: 'brieuc',
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
function clubWords(s) {
  const mots = normalizeClub(s).split(' ').filter(Boolean);
  const remplaces = mots.map((w) => CLUB_MOTS_REMPLACEMENT[w] || w);
  const sansGeneriques = remplaces.filter((w) => !CLUB_MOTS_GENERIQUES.has(w));
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
    if (error) { console.error(`Erreur lecture ${table} :`, error.message); process.exit(1); }
    toutes = toutes.concat(data || []);
    if (!data || data.length < pageSize) break;
    page++;
  }
  return toutes;
}

const calendrier = await selectAll('calendrier_officiel', 'id, equipe_domicile, equipe_exterieur, division, saison, date_match', (q) => q.eq('division', DIVISION).eq('saison', SAISON));
console.log(`${calendrier.length} ligne(s) calendrier_officiel ${DIVISION} ${SAISON}.\n`);

// IMPORTANT : calendrier_officiel.id peut revenir en string (bigint) côté
// supabase-js alors que matchs_joueur.calendrier_officiel_id revient en
// number — on force Number() partout pour que les comparaisons ===/Set
// fonctionnent (sinon matchsOrph reste silencieusement vide et la
// suppression de la ligne calendrier échoue par contrainte de clé
// étrangère, avec des matchs_joueur jamais migrés).
const lignesParId = new Map(calendrier.map((r) => [Number(r.id), r]));
const equipes = new Map(); // nom -> { count, ids: Set }
for (const r of calendrier) {
  for (const eq of [r.equipe_domicile, r.equipe_exterieur]) {
    if (!eq) continue;
    if (!equipes.has(eq)) equipes.set(eq, { count: 0, ids: new Set() });
    equipes.get(eq).count++;
    equipes.get(eq).ids.add(Number(r.id));
  }
}
function joursEcart(d1, d2) {
  return Math.abs((new Date(d1) - new Date(d2)) / 86400000);
}

const noms = [...equipes.keys()];
const paires = [];
for (let i = 0; i < noms.length; i++) {
  for (let j = i + 1; j < noms.length; j++) {
    if (clubWordsMatch(noms[i], noms[j])) paires.push([noms[i], noms[j]]);
  }
}
console.log(`${paires.length} paire(s) ambiguë(s) détectée(s).\n`);

let totalRattaches = 0, totalSupprimes = 0, totalLignesCal = 0, totalIgnorees = 0;

for (const [a, b] of paires) {
  const infoA = equipes.get(a), infoB = equipes.get(b);
  const [orphNom, orphInfo, refNom, refInfo] = infoA.count <= infoB.count ? [a, infoA, b, infoB] : [b, infoB, a, infoA];

  if (refInfo.count < orphInfo.count * RATIO_MIN_SURETE) {
    console.log(`Ignoré (comptes trop proches, probablement 2 clubs distincts) : "${a}" (${infoA.count}) ⟷ "${b}" (${infoB.count})`);
    totalIgnorees++;
    continue;
  }

  const orphIds = [...orphInfo.ids];
  const refIds = [...refInfo.ids];
  console.log(`\n=== "${orphNom}" (${orphInfo.count} match(s), orpheline) → "${refNom}" (${refInfo.count} match(s), référence) ===`);

  // Pour chaque ligne orpheline, retrouve la ligne de référence exacte du
  // MÊME match (date la plus proche, ±3 jours) — jamais une ligne de
  // référence arbitraire, pour ne pas mélanger les stats de matchs
  // différents.
  const correspondance = new Map(); // idOrph -> idRefCorrespondante (ou null)
  for (const idOrph of orphIds) {
    const ligneOrph = lignesParId.get(idOrph);
    let meilleure = null, meilleurEcart = Infinity;
    for (const idRef of refIds) {
      const ligneRef = lignesParId.get(idRef);
      const ecart = joursEcart(ligneOrph.date_match, ligneRef.date_match);
      if (ecart < meilleurEcart) { meilleurEcart = ecart; meilleure = idRef; }
    }
    if (meilleure !== null && meilleurEcart <= 3) correspondance.set(idOrph, meilleure);
    else console.log(`  Ligne id=${idOrph} (${ligneOrph.date_match}) : AUCUNE ligne de référence proche (±3j) trouvée — ignorée par sécurité.`);
  }

  // IMPORTANT : ne PAS interroger matchs_joueur pour les 30-32 ids de la
  // ligne de référence en entier — un club complet sur la saison peut
  // avoir 1000+ lignes matchs_joueur (20-45 joueurs × 30 matchs), ce qui
  // dépasse la limite par défaut de 1000 lignes de PostgREST et tronque
  // silencieusement le résultat (observé : matchs.length plafonné à 1000
  // alors que count réel atteignait 1490). On ne requête que les ids
  // réellement utiles : les orphelines + UNIQUEMENT les références qui
  // leur correspondent exactement (pas toute la saison de la référence).
  const refIdsUtiles = [...new Set(correspondance.values())];
  const idsUtiles = [...orphIds, ...refIdsUtiles];
  const { data: matchs, error } = await supabase
    .from('matchs_joueur')
    .select('id, joueur_id, calendrier_officiel_id')
    .in('calendrier_officiel_id', idsUtiles);
  if (error) { console.error('Erreur lecture matchs_joueur :', error.message); process.exit(1); }

  const joueursParRef = new Map(refIds.map((id) => [id, new Set(matchs.filter((m) => m.calendrier_officiel_id === id).map((m) => m.joueur_id))]));

  for (const idOrph of orphIds) {
    const idRefCorrespondante = correspondance.get(idOrph);
    if (idRefCorrespondante === undefined) continue; // pas de correspondance sûre : on ne touche pas ses matchs_joueur
    const matchsOrph = matchs.filter((m) => m.calendrier_officiel_id === idOrph);
    const joueursRefCorrespondante = joueursParRef.get(idRefCorrespondante);
    console.log(`  Ligne id=${idOrph} (${matchsOrph.length} matchs_joueur) → référence id=${idRefCorrespondante} (${joueursRefCorrespondante.size} joueur(s) déjà présents)`);
    for (const m of matchsOrph) {
      if (joueursRefCorrespondante.has(m.joueur_id)) {
        console.log(`    ${dryRun ? 'À supprimer' : 'Suppression'} : matchs_joueur id=${m.id} (joueur_id=${m.joueur_id}, doublon)`);
        totalSupprimes++;
        if (!dryRun) {
          const { error: delErr } = await supabase.from('matchs_joueur').delete().eq('id', m.id);
          if (delErr) console.log(`      Erreur suppression : ${delErr.message}`);
        }
      } else {
        joueursRefCorrespondante.add(m.joueur_id);
        console.log(`    ${dryRun ? 'À rattacher' : 'Rattachement'} : matchs_joueur id=${m.id} (joueur_id=${m.joueur_id}) → calendrier_officiel_id=${idRefCorrespondante}`);
        totalRattaches++;
        if (!dryRun) {
          const { error: updErr } = await supabase.from('matchs_joueur').update({ calendrier_officiel_id: idRefCorrespondante }).eq('id', m.id);
          if (updErr) console.log(`      Erreur rattachement : ${updErr.message}`);
        }
      }
    }
  }

  for (const idOrph of orphIds) {
    if (!correspondance.has(idOrph)) continue; // pas de correspondance sûre : ligne laissée en place pour revue manuelle
    console.log(`  ${dryRun ? 'À supprimer' : 'Suppression'} : ligne calendrier_officiel id=${idOrph} (devenue vide).`);
    totalLignesCal++;
    if (!dryRun) {
      const { error: delCalErr } = await supabase.from('calendrier_officiel').delete().eq('id', idOrph);
      if (delCalErr) console.log(`    Erreur suppression : ${delCalErr.message}`);
    }
  }
}

console.log(`\nRésumé global : ${totalRattaches} rattachement(s), ${totalSupprimes} suppression(s) matchs_joueur, ${totalLignesCal} ligne(s) calendrier à supprimer, ${totalIgnorees} paire(s) ignorée(s) (comptes trop proches).`);
if (dryRun) console.log('DRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
