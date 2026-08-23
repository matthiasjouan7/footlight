// Diagnostic lecture seule : l'utilisateur signale voir 2 calendriers sur
// le profil des joueurs d'Union Foot Touraine (N1). Dump toutes les lignes
// matchs_joueur d'un joueur Touraine pour repérer la cause (doublons de
// matchs_joueur, deux saisons/niveaux différents, dates dupliquées après
// la réconciliation du calendrier groupe C, etc.).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

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

const joueurs = await selectAll('joueurs', 'id, prenom, nom, club, niveau, saison', (q) => q.ilike('club', '%touraine%'));
console.log(`Joueurs avec "Touraine" dans le club : ${joueurs.length}`);
for (const j of joueurs) console.log(`  id=${j.id} — ${j.prenom} ${j.nom} — club="${j.club}" niveau=${j.niveau} saison=${j.saison}`);

if (!joueurs.length) process.exit(0);

const premier = joueurs[0];
console.log(`\n=== Détail matchs_joueur pour ${premier.prenom} ${premier.nom} (id=${premier.id}) ===`);
const matchs = await selectAll('matchs_joueur', '*', (q) => q.eq('joueur_id', premier.id));
console.log(`Total lignes matchs_joueur : ${matchs.length}`);

const parSaison = {};
for (const m of matchs) parSaison[m.saison] = (parSaison[m.saison] || 0) + 1;
console.log(`Répartition par saison : ${JSON.stringify(parSaison)}`);

const matchs2627 = matchs.filter((m) => m.saison === '2026-2027').sort((a, b) => (a.date_match || '').localeCompare(b.date_match || ''));
console.log(`\nLignes saison 2026-2027 (${matchs2627.length}) :`);
for (const m of matchs2627) {
  console.log(`  id=${m.id} — ${m.date_match} — ${m.domicile ? 'vs' : '@'} ${m.adversaire} — calendrier_officiel_id=${m.calendrier_officiel_id} — competition=${m.competition}`);
}

// Détecte les doublons (même date_match, même adversaire).
const cles = new Map();
for (const m of matchs2627) {
  const cle = `${m.date_match}|${m.adversaire}`;
  if (!cles.has(cle)) cles.set(cle, []);
  cles.get(cle).push(m.id);
}
const doublons = [...cles.entries()].filter(([, ids]) => ids.length > 1);
console.log(`\nDoublons (même date + adversaire) : ${doublons.length}`);
for (const [cle, ids] of doublons) console.log(`  ${cle} -> ids ${ids.join(', ')}`);
