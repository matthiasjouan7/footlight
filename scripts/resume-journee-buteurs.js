// Résumé (lecture seule) : pour une division/saison données, liste les
// buteurs de la dernière journée jouée et repère les attaquants "réguliers"
// (buteurs sur plusieurs journées consécutives) — utile pour préparer du
// contenu (vidéos, posts) mettant en avant la régularité des attaquants
// avant une prochaine journée.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }

const DIVISION = process.env.DIVISION || 'Ligue 3';
const SAISON = process.env.SAISON || '2026-2027';

const supabase = createClient(supabaseUrl, supabaseKey);

// .range() (LIMIT/OFFSET) sans ORDER BY n'est pas stable en cas d'écriture
// concurrente (ex: le sync quotidien) : une ligne déplacée physiquement
// entre deux pages peut être renvoyée deux fois. On trie par id pour rendre
// la pagination déterministe.
async function selectAll(query) {
  const pageSize = 1000;
  let toutes = [];
  let page = 0;
  for (;;) {
    const { data, error } = await query.order('id').range(page * pageSize, page * pageSize + pageSize - 1);
    if (error) { console.error('Erreur lecture :', error.message); process.exit(1); }
    toutes = toutes.concat(data || []);
    if (!data || data.length < pageSize) break;
    page++;
  }
  return toutes;
}

const joueurs = await selectAll(supabase.from('joueurs').select('id, prenom, nom, club, poste').eq('niveau', DIVISION).eq('saison', SAISON));
const joueurById = new Map(joueurs.map((j) => [j.id, j]));
const idsJoueurs = joueurs.map((j) => j.id);

if (!idsJoueurs.length) { console.log(`Aucun joueur trouvé pour ${DIVISION} (${SAISON}).`); process.exit(0); }

const matchsBruts = await selectAll(
  supabase.from('matchs_joueur').select('id, joueur_id, date_match, adversaire, buts, minutes_jouees, titulaire').eq('saison', SAISON).in('joueur_id', idsJoueurs)
);
// Filet de sécurité supplémentaire contre un doublon de pagination.
const matchs = [...new Map(matchsBruts.map((m) => [m.id, m])).values()];

// Le calendrier est pré-généré pour toute la saison (matchs futurs inclus) :
// seul minutes_jouees renseigné distingue un match déjà joué et synchronisé
// d'un simple match à venir dans le calendrier officiel.
const matchsJoues = matchs.filter((m) => m.minutes_jouees != null);
const journees = [...new Set(matchsJoues.map((m) => m.date_match).filter(Boolean))].sort();
console.log(`${DIVISION} (${SAISON}) : ${journees.length} journée(s) déjà jouée(s) et synchronisée(s).`);
console.log(`Dates : ${journees.join(', ')}\n`);

const derniereJournee = journees[journees.length - 1];
if (derniereJournee) {
  const buteursDerniere = matchsJoues
    .filter((m) => m.date_match === derniereJournee && m.buts > 0)
    .map((m) => ({ ...joueurById.get(m.joueur_id), buts: m.buts, adversaire: m.adversaire }))
    .sort((a, b) => b.buts - a.buts);
  console.log(`--- Buteurs de la dernière journée jouée (${derniereJournee}) : ${buteursDerniere.length} ---`);
  for (const b of buteursDerniere) console.log(`  ${b.buts} but(s) — ${b.prenom} ${b.nom} (${b.poste}, ${b.club}) vs ${b.adversaire}`);
}

console.log(`\n--- Régularité des attaquants sur les ${journees.length} journée(s) jouée(s) ---`);
const attaquants = joueurs.filter((j) => j.poste === 'attaquant');
for (const a of attaquants) {
  const sesMatchs = matchsJoues.filter((m) => m.joueur_id === a.id).sort((x, y) => (x.date_match || '').localeCompare(y.date_match || ''));
  if (!sesMatchs.length) continue;
  const totalButs = sesMatchs.reduce((s, m) => s + (m.buts || 0), 0);
  const journeesButeur = sesMatchs.filter((m) => m.buts > 0).length;
  if (totalButs > 0) {
    const detail = sesMatchs.map((m) => `${m.date_match}:${m.buts || 0}b`).join(' ');
    console.log(`  ${a.prenom} ${a.nom} (${a.club}) — ${totalButs} but(s) sur ${journeesButeur}/${sesMatchs.length} journée(s) jouée(s) [${detail}]`);
  }
}

// Compteur encore à 0 : attaquants ayant joué au moins un match synchronisé
// sans avoir marqué — candidats à "ouvrir leur compteur" à la prochaine
// journée, utile pour teaser du contenu avant un match.
console.log(`\n--- Attaquants au compteur encore vierge (ont joué, 0 but) ---`);
for (const a of attaquants) {
  const sesMatchs = matchsJoues.filter((m) => m.joueur_id === a.id);
  if (!sesMatchs.length) continue;
  const totalButs = sesMatchs.reduce((s, m) => s + (m.buts || 0), 0);
  if (totalButs === 0) {
    const minutesTotal = sesMatchs.reduce((s, m) => s + (m.minutes_jouees || 0), 0);
    console.log(`  ${a.prenom} ${a.nom} (${a.club}) — 0 but sur ${sesMatchs.length} match(s) joué(s), ${minutesTotal} min au total`);
  }
}
