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

// Recherche large par nom (pas seulement club Touraine) : détecte un
// éventuel doublon de PROFIL (deux lignes joueurs pour la même personne,
// ex. un ancien profil resté actif à un autre club).
const NOMS_CIBLES_LARGE = (process.env.NOMS_CIBLES || 'popineau,lopez').split(',').map((s) => s.trim());
for (const nom of NOMS_CIBLES_LARGE) {
  const profilsLarges = await selectAll('joueurs', 'id, prenom, nom, club, niveau, saison, profil_public, email', (q) => q.ilike('nom', `%${nom}%`));
  console.log(`\nRecherche large "${nom}" dans TOUTE la table joueurs (tous clubs) : ${profilsLarges.length} résultat(s)`);
  for (const p of profilsLarges) console.log(`  id=${p.id} — ${p.prenom} ${p.nom} — club="${p.club}" niveau=${p.niveau} saison=${p.saison} profil_public=${p.profil_public} email=${p.email}`);
}

const joueurs = await selectAll('joueurs', 'id, prenom, nom, club, niveau, saison', (q) => q.ilike('club', '%touraine%'));
console.log(`Joueurs avec "Touraine" dans le club : ${joueurs.length}`);
for (const j of joueurs) console.log(`  id=${j.id} — ${j.prenom} ${j.nom} — club="${j.club}" niveau=${j.niveau} saison=${j.saison}`);

if (!joueurs.length) process.exit(0);

const NOMS_CIBLES = (process.env.NOMS_CIBLES || 'popineau,lopez').split(',').map((s) => s.trim().toLowerCase());
const cibles = joueurs.filter((j) => NOMS_CIBLES.some((n) => (j.nom || '').toLowerCase().includes(n) || (j.prenom || '').toLowerCase().includes(n)));
const aTraiter = cibles.length ? cibles : joueurs;
console.log(`\nJoueurs ciblés (${cibles.length ? 'par nom' : 'tous, aucun nom trouvé'}) : ${aTraiter.map((j) => `${j.prenom} ${j.nom}`).join(', ')}`);

for (const joueur of aTraiter) {
  console.log(`\n=== Détail matchs_joueur pour ${joueur.prenom} ${joueur.nom} (id=${joueur.id}) ===`);
  const matchs = await selectAll('matchs_joueur', '*', (q) => q.eq('joueur_id', joueur.id));
  console.log(`Total lignes matchs_joueur : ${matchs.length}`);

  const parSaison = {};
  for (const m of matchs) parSaison[m.saison] = (parSaison[m.saison] || 0) + 1;
  console.log(`Répartition par saison : ${JSON.stringify(parSaison)}`);

  const matchs2627 = matchs.filter((m) => m.saison === '2026-2027').sort((a, b) => (a.date_match || '').localeCompare(b.date_match || ''));
  console.log(`Lignes saison 2026-2027 (${matchs2627.length}) :`);
  for (const m of matchs2627) {
    console.log(`  id=${m.id} — ${m.date_match} — ${m.domicile ? 'vs' : '@'} ${m.adversaire} — calendrier_officiel_id=${m.calendrier_officiel_id} — competition=${m.competition}`);
  }

  // Détecte les doublons par adversaire (peu importe la date, pour repérer
  // un même match dupliqué avec une date différente après réconciliation).
  const parAdversaire = new Map();
  for (const m of matchs2627) {
    const cle = m.adversaire || '(vide)';
    if (!parAdversaire.has(cle)) parAdversaire.set(cle, []);
    parAdversaire.get(cle).push(m);
  }
  const doublonsAdversaire = [...parAdversaire.entries()].filter(([, ms]) => ms.length > 1);
  console.log(`Adversaires apparaissant plus d'une fois : ${doublonsAdversaire.length}`);
  for (const [adv, ms] of doublonsAdversaire) {
    console.log(`  ${adv} -> ${ms.map((m) => `id=${m.id} date=${m.date_match} cal_id=${m.calendrier_officiel_id}`).join(' | ')}`);
  }

  const stats = await selectAll('stats_saisons', '*', (q) => q.eq('joueur_id', joueur.id));
  console.log(`Lignes stats_saisons : ${stats.length}`);
  for (const s of stats) console.log(`  id=${s.id} — club="${s.club}" niveau=${s.niveau} saison=${s.saison}`);
}
