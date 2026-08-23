// Union Foot Touraine repêchée en National 1 avant le début de la saison
// 2026-2027 : le calendrier_officiel National 2 / groupe H la modélise
// encore comme une équipe active (26 lignes, un aller-retour complet
// contre les 13 autres clubs de la poule), alors que la page FFF réelle
// (https://epreuves.fff.fr/competition/engagement/3-n2/phase/1/8/
// resultats-et-calendrier, POULE H, cpNo=452037/phNo=1/gpNo=8) affiche un
// "exempt" à sa place dès la journée 1 — confirmé par diagnostic-fff-n2-
// groupe.js. Contrairement à National 1 groupe C, il n'y a pas d'équipe
// de remplacement : ces 26 matchs ne se joueront jamais, ils sont
// simplement à retirer.
//
// Aucun de ces matchs n'a pu être réellement joué (Touraine n'a jamais
// participé à cette poule cette saison), donc les lignes matchs_joueur qui
// les référencent ne peuvent être que des placeholders vides (créés par
// generer-calendriers-existants.js à l'inscription des joueurs des autres
// clubs) — supprimables sans perte. Même garde-fou que import-fff-
// national1-groupec.js : une ligne matchs_joueur avec une vraie stat
// bloquerait la suppression et serait seulement signalée, jamais effacée
// automatiquement.
import { createClient } from '@supabase/supabase-js';

const DRY_RUN = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

console.log(`Mode : ${DRY_RUN ? 'DRY_RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}\n`);

async function selectAll(table, colonnes, filtre) {
  let tous = [];
  let debut = 0;
  const TAILLE_PAGE = 1000;
  for (;;) {
    let q = supabase.from(table).select(colonnes).range(debut, debut + TAILLE_PAGE - 1);
    if (filtre) q = filtre(q);
    const { data, error } = await q;
    if (error) { console.error(`Erreur lecture ${table} :`, error.message); process.exit(1); }
    tous = tous.concat(data || []);
    if (!data || data.length < TAILLE_PAGE) break;
    debut += TAILLE_PAGE;
  }
  return tous;
}

const lignesTouraine = await selectAll('calendrier_officiel', 'id, equipe_domicile, equipe_exterieur, date_match, journee', (q) =>
  q.eq('division', 'N2').eq('groupe', 'H').eq('saison', '2026-2027').or('equipe_domicile.ilike.%touraine%,equipe_exterieur.ilike.%touraine%')
);
console.log(`Lignes calendrier_officiel N2/H mentionnant Touraine : ${lignesTouraine.length}`);
for (const l of lignesTouraine) console.log(`  id=${l.id} — ${l.date_match} — J${l.journee} — ${l.equipe_domicile} vs ${l.equipe_exterieur}`);

if (!lignesTouraine.length) {
  console.log('\nRien à faire.');
  process.exit(0);
}

const ids = lignesTouraine.map((l) => l.id);
const CHAMPS_STATS = ['buts', 'passes_decisives', 'minutes_jouees', 'cartons_jaunes', 'cartons_rouges'];
const idsAvecStats = new Set();
const placeholdersParCalendrierId = new Map();
for (let i = 0; i < ids.length; i += 100) {
  const lot = ids.slice(i, i + 100);
  let debut = 0;
  let refsBrutes = [];
  for (;;) {
    const { data: page, error } = await supabase
      .from('matchs_joueur')
      .select(`id, calendrier_officiel_id, ${CHAMPS_STATS.join(', ')}`)
      .in('calendrier_officiel_id', lot)
      .range(debut, debut + 999);
    if (error) { console.error('Erreur lecture matchs_joueur :', error.message); process.exit(1); }
    refsBrutes = refsBrutes.concat(page || []);
    if (!page || page.length < 1000) break;
    debut += 1000;
  }
  for (const r of refsBrutes) {
    const aDesStats = CHAMPS_STATS.some((c) => r[c] != null);
    if (aDesStats) {
      idsAvecStats.add(r.calendrier_officiel_id);
    } else {
      if (!placeholdersParCalendrierId.has(r.calendrier_officiel_id)) placeholdersParCalendrierId.set(r.calendrier_officiel_id, []);
      placeholdersParCalendrierId.get(r.calendrier_officiel_id).push(r.id);
    }
  }
}

const aSupprimer = lignesTouraine.filter((l) => !idsAvecStats.has(l.id));
const protegees = lignesTouraine.filter((l) => idsAvecStats.has(l.id));
const placeholdersASupprimer = aSupprimer.flatMap((l) => placeholdersParCalendrierId.get(l.id) || []);

console.log(`\nÀ supprimer : ${aSupprimer.length} (avec ${placeholdersASupprimer.length} placeholder(s) matchs_joueur associé(s))`);
console.log(`Protégées par des stats réelles (jamais supprimées automatiquement) : ${protegees.length}`);
if (protegees.length) {
  for (const l of protegees) console.log(`  PROTÉGÉE id=${l.id} — ${l.date_match} — J${l.journee} — ${l.equipe_domicile} vs ${l.equipe_exterieur}`);
}

if (DRY_RUN) {
  console.log('\nDRY_RUN : aucune suppression effectuée.');
  process.exit(0);
}

console.log('\n=== Écriture réelle ===');
let placeholdersSupprimes = 0;
for (let i = 0; i < placeholdersASupprimer.length; i += 100) {
  const lot = placeholdersASupprimer.slice(i, i + 100);
  const { error } = await supabase.from('matchs_joueur').delete().in('id', lot);
  if (error) { console.error('Erreur suppression placeholders matchs_joueur :', error.message); process.exit(1); }
  placeholdersSupprimes += lot.length;
}
console.log(`Supprimé : ${placeholdersSupprimes} placeholder(s) matchs_joueur.`);

let supprimes = 0;
for (const l of aSupprimer) {
  const { error } = await supabase.from('calendrier_officiel').delete().eq('id', l.id);
  if (error) { console.error(`Erreur suppression id=${l.id} :`, error.message); process.exit(1); }
  supprimes++;
}
console.log(`Supprimé : ${supprimes} ligne(s) calendrier_officiel (matchs contre Touraine, jamais joués).`);

if (protegees.length) {
  console.log(`\nATTENTION : ${protegees.length} ligne(s) protégée(s) par des stats réelles n'ont pas été touchées — à examiner manuellement.`);
}
