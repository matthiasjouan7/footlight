// Équivalent de diagnostic-scan-clubs-n1.js pour la division N2 (8 groupes,
// ~2400 joueurs — bien plus gros que N1, d'où un affichage limité aux clubs
// les plus suspects plutôt que la liste complète). Vérifie systématiquement
// tous les clubs N2 pour repérer d'éventuels clubs isolés/bloqués — à la
// fois sur le nombre de lignes matchs_joueur (calendrier par joueur) et sur
// le compteur agrégé joueurs.matchs_joues (stats réelles).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const SAISON = '2026-2027';

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

async function main() {
  const joueurs = await fetchToutesPages('joueurs', 'id, prenom, nom, club, matchs_joues', (q) => q.eq('niveau', 'N2').eq('saison', SAISON));
  console.log(`${joueurs.length} joueur(s) N2 saison ${SAISON}, ${new Set(joueurs.map((j) => j.club)).size} club(s) distinct(s).\n`);

  // Pagination par lot ET par page : un lot de 50 joueurs cumule souvent
  // plus de 1000 lignes matchs_joueur (limite de page par défaut
  // PostgREST/Supabase) — voir même correctif dans diagnostic-scan-clubs-n1.js.
  const ids = joueurs.map((j) => j.id);
  let mj = [];
  const TAILLE_LOT = 50;
  for (let i = 0; i < ids.length; i += TAILLE_LOT) {
    const lot = ids.slice(i, i + TAILLE_LOT);
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data, error } = await supabase.from('matchs_joueur').select('joueur_id').in('joueur_id', lot).range(from, from + pageSize - 1);
      if (error) { console.error('Erreur matchs_joueur :', error.message); process.exit(1); }
      mj = mj.concat(data);
      if (data.length < pageSize) break;
      from += pageSize;
    }
  }
  const compteMj = new Map();
  for (const m of mj) compteMj.set(m.joueur_id, (compteMj.get(m.joueur_id) || 0) + 1);

  const parClub = new Map();
  for (const j of joueurs) {
    if (!parClub.has(j.club)) parClub.set(j.club, []);
    parClub.get(j.club).push({ mj: compteMj.get(j.id) || 0, joues: j.matchs_joues || 0 });
  }

  const stats = [...parClub.entries()].map(([club, liste]) => ({
    club,
    n: liste.length,
    moyenneMj: liste.reduce((a, b) => a + b.mj, 0) / liste.length,
    moyenneJoues: liste.reduce((a, b) => a + b.joues, 0) / liste.length,
  })).sort((a, b) => a.moyenneMj - b.moyenneMj);

  console.log(`--- Les 40 clubs avec la moyenne matchs_joueur la plus basse (sur ${stats.length} clubs distincts) ---`);
  stats.slice(0, 40).forEach((c) => console.log(`  ${c.club} (${c.n} joueur(s)) : mj=${c.moyenneMj.toFixed(1)}, joues=${c.moyenneJoues.toFixed(1)}`));

  const statsParJoues = [...stats].sort((a, b) => a.moyenneJoues - b.moyenneJoues);
  console.log(`\n--- Les 40 clubs avec la moyenne matchs_joues (stat réelle) la plus basse, mj>=20 (calendrier généré) ---`);
  statsParJoues.filter((c) => c.moyenneMj >= 20).slice(0, 40).forEach((c) => console.log(`  ${c.club} (${c.n} joueur(s)) : mj=${c.moyenneMj.toFixed(1)}, joues=${c.moyenneJoues.toFixed(1)}`));
}

main().finally(() => process.exit(process.exitCode || 0));
