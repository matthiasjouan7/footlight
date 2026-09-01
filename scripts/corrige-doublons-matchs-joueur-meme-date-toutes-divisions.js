// Généralisation de corrige-doublons-matchs-joueur-meme-date-groupe-c.js à
// TOUTES les divisions : après la fusion des lignes calendrier_officiel
// dupliquées (corrige-doublons-calendrier-toutes-divisions.js), certains
// matchs_joueur peuvent encore pointer à la fois vers une ligne "legacy" en
// majuscules et vers la ligne canonique pour le même match réel — cas où la
// fusion n'a pas pu supprimer la ligne legacy avec certitude (ex: un autre
// joueur non résolu), mais où rattrapage-lequipe-match-stats.js a quand même
// synchronisé des stats identiques sur les deux lignes pour CE joueur,
// doublant son compte de matchs joués (observé pour Fréjus/Rumilly, N1
// groupe C, avant correction).
//
// Contrairement à la fusion calendrier (qui doit rester scindée par groupe
// pour ne jamais rapprocher deux dates de groupes différents), ce correctif
// ne dépend que de la DIVISION du joueur (joueurs.niveau) : une ligne
// calendrier_officiel_id est "legacy" ou "canonique" indépendamment du
// groupe, et un joueur n'a de toute façon des matchs que dans son propre
// groupe. Boucle donc sur chaque division trouvée en base (N1, N2, Ligue 3)
// plutôt que sur chaque couple division/groupe.
//
// Ne requête en détail QUE les joueurs ayant au moins un matchs_joueur
// pointant vers une ligne legacy (identifiés d'abord en une requête groupée),
// et non tous les joueurs de la division — nécessaire pour rester rapide sur
// National 2 (~2400 joueurs).
//
// Pour chaque joueur concerné ayant plusieurs matchs_joueur avec
// minutes_jouees renseignées à la MÊME date_match, garde la ligne dont
// calendrier_officiel_id pointe vers une ligne calendrier_officiel NON en
// majuscules (canonique) et supprime les autres. Recalcule ensuite
// joueurs.matchs_joues (et les autres agrégats de saison) pour tous les
// joueurs concernés via reparation-agregats-matchs-joues.js (déjà existant,
// idempotent).
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
const TAILLE_LOT = 50;

function estMajuscule(s) { return typeof s === 'string' && s.length > 0 && s === s.toUpperCase(); }

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

// PostgREST plafonne chaque requête à 1000 lignes par défaut : batching par
// id EN PLUS de la pagination par .range() dans chaque lot (voir historique
// groupe C : sans ça, le total peut rester figé à N lots × 1000).
async function fetchMatchsJoueurParCalendrierIds(ids) {
  let toutes = [];
  for (let i = 0; i < ids.length; i += TAILLE_LOT) {
    const lot = ids.slice(i, i + TAILLE_LOT);
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data, error } = await supabase.from('matchs_joueur').select('id, joueur_id, calendrier_officiel_id').in('calendrier_officiel_id', lot).range(from, from + pageSize - 1).not('minutes_jouees', 'is', null);
      if (error) { console.error('Erreur lecture matchs_joueur :', error.message); process.exit(1); }
      toutes = toutes.concat(data);
      if (data.length < pageSize) break;
      from += pageSize;
    }
  }
  return toutes;
}

const toutCalendrier = await fetchToutesPages('calendrier_officiel', 'id, division, equipe_domicile, equipe_exterieur', (q) => q.eq('saison', SAISON));
const divisions = [...new Set(toutCalendrier.map((r) => r.division))];
console.log(`${toutCalendrier.length} ligne(s) calendrier_officiel, ${divisions.length} division(s) : ${divisions.join(', ')}.\n`);

let totalSupprimesGlobal = 0, totalJoueursAffectesGlobal = 0;

for (const division of divisions) {
  console.log(`=== ${division} ===`);
  const calendrier = toutCalendrier.filter((r) => r.division === division);
  const legacyIds = [...new Set(calendrier.filter((r) => estMajuscule(r.equipe_domicile) && estMajuscule(r.equipe_exterieur)).map((r) => Number(r.id)))];
  const idsCalendrierDivision = new Set(calendrier.map((r) => Number(r.id)));
  console.log(`  ${calendrier.length} ligne(s) calendrier, dont ${legacyIds.length} legacy.`);

  if (!legacyIds.length) { console.log('  Rien à faire.\n'); continue; }

  const mjLegacy = await fetchMatchsJoueurParCalendrierIds(legacyIds);
  const joueurIdsConcernes = [...new Set(mjLegacy.map((m) => m.joueur_id))];
  console.log(`  ${mjLegacy.length} matchs_joueur pointent vers une ligne legacy, ${joueurIdsConcernes.length} joueur(s) potentiellement concerné(s).`);

  if (!joueurIdsConcernes.length) { console.log('  Rien à faire.\n'); continue; }

  let joueurs = [];
  for (let i = 0; i < joueurIdsConcernes.length; i += TAILLE_LOT) {
    const lot = joueurIdsConcernes.slice(i, i + TAILLE_LOT);
    const { data, error } = await supabase.from('joueurs').select('id, prenom, nom, club').in('id', lot);
    if (error) { console.error('Erreur lecture joueurs :', error.message); process.exit(1); }
    joueurs = joueurs.concat(data);
  }

  let totalSupprimes = 0, totalJoueursAffectes = 0;

  for (const j of joueurs) {
    const { data: mj, error } = await supabase.from('matchs_joueur').select('id, date_match, calendrier_officiel_id, minutes_jouees').eq('joueur_id', j.id).eq('saison', SAISON).not('minutes_jouees', 'is', null);
    if (error) { console.log(`    Erreur pour ${j.prenom} ${j.nom} : ${error.message}`); continue; }
    const mjDivision = mj.filter((m) => m.calendrier_officiel_id && idsCalendrierDivision.has(Number(m.calendrier_officiel_id)));

    const parDate = new Map();
    for (const m of mjDivision) {
      if (!parDate.has(m.date_match)) parDate.set(m.date_match, []);
      parDate.get(m.date_match).push(m);
    }

    let joueurAffecte = false;
    for (const [date, liste] of parDate) {
      if (liste.length < 2) continue;
      const canoniques = liste.filter((m) => !legacyIds.includes(Number(m.calendrier_officiel_id)));
      const legacy = liste.filter((m) => legacyIds.includes(Number(m.calendrier_officiel_id)));
      if (!canoniques.length || !legacy.length) {
        console.log(`    ${j.prenom} ${j.nom} (${j.club}) : ${liste.length} lignes pour ${date}, mais pas de séparation legacy/canonique claire (ids: ${liste.map((m) => m.calendrier_officiel_id).join(',')}) — ignoré par sécurité.`);
        continue;
      }
      joueurAffecte = true;
      for (const m of legacy) {
        console.log(`    ${j.prenom} ${j.nom} (${j.club}) : ${dryRun ? 'à supprimer' : 'suppression'} matchs_joueur id=${m.id} (doublon legacy, date=${date}, calendrier_officiel_id=${m.calendrier_officiel_id})`);
        totalSupprimes++;
        if (!dryRun) {
          const { data, error: errDel } = await supabase.from('matchs_joueur').delete().eq('id', m.id).select('id');
          if (errDel) console.log(`      Erreur : ${errDel.message}`);
          else if (!data || !data.length) console.log(`      ATTENTION : suppression sans effet (0 ligne affectée) pour matchs_joueur id=${m.id}`);
        }
      }
    }
    if (joueurAffecte) totalJoueursAffectes++;
  }

  console.log(`  Résumé ${division} : ${totalSupprimes} ligne(s) matchs_joueur en doublon ${dryRun ? 'à supprimer' : 'supprimée(s)'}, ${totalJoueursAffectes} joueur(s) affecté(s).\n`);
  totalSupprimesGlobal += totalSupprimes;
  totalJoueursAffectesGlobal += totalJoueursAffectes;
}

console.log(`=== TOTAL toutes divisions ===`);
console.log(`${totalSupprimesGlobal} ligne(s) matchs_joueur en doublon ${dryRun ? 'à supprimer' : 'supprimée(s)'}, ${totalJoueursAffectesGlobal} joueur(s) affecté(s).`);
if (!dryRun && totalSupprimesGlobal > 0) {
  console.log('\nLes lignes en doublon ont été supprimées. Lancer ensuite reparation-agregats-matchs-joues.js (déjà existant, idempotent) pour recalculer joueurs.matchs_joues et les autres agrégats depuis les matchs_joueur restants.');
}

if (dryRun) console.log('\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
