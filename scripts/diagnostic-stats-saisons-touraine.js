// Diagnostic lecture seule : l'utilisateur signale 2 calendriers sur le
// profil des joueurs Touraine. matchs_joueur n'a aucun doublon (vérifié
// via diagnostic-double-calendrier-touraine.js). generer-calendriers-
// existants.js traite deux sources de "cibles" par joueur : la ligne
// courante (joueurs.club/niveau/saison) ET chaque ligne stats_saisons
// (historique). Si un joueur Touraine a une ligne stats_saisons pour la
// saison COURANTE (2026-2027) en plus de sa ligne joueurs courante, le
// profil pourrait afficher deux blocs calendrier (saison courante +
// "historique" pointant vers la même saison). Vérifie stats_saisons pour
// les 17 joueurs Touraine.
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
console.log(`Joueurs Touraine : ${joueurs.length}`);
const ids = joueurs.map((j) => j.id);
const nomParId = new Map(joueurs.map((j) => [j.id, `${j.prenom} ${j.nom}`]));

const stats = await selectAll('stats_saisons', '*', (q) => q.in('joueur_id', ids));
console.log(`\nLignes stats_saisons pour ces joueurs : ${stats.length}`);
for (const s of stats) {
  console.log(`  ${nomParId.get(s.joueur_id)} — club="${s.club}" niveau=${s.niveau} saison=${s.saison}`);
}

const doublonsSaisonCourante = stats.filter((s) => s.saison === '2026-2027');
console.log(`\nLignes stats_saisons pour la saison COURANTE (2026-2027) : ${doublonsSaisonCourante.length}`);
for (const s of doublonsSaisonCourante) {
  console.log(`  PROBLÈME id=${s.id} — ${nomParId.get(s.joueur_id)} — club="${s.club}" niveau=${s.niveau}`);
}
