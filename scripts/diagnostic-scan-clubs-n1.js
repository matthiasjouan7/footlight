// Diagnostic lecture seule : après la correction de Locminé et Fréjus
// (calendrier/matchs_joueur bloqués), vérifie systématiquement tous les
// clubs N1 pour repérer d'éventuels autres cas isolés — à la fois sur le
// nombre de lignes matchs_joueur (calendrier par joueur) et sur le
// compteur agrégé joueurs.matchs_joues (stats réelles, qui nécessite
// minutes_jouees renseigné).
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
  const joueurs = await fetchToutesPages('joueurs', 'id, prenom, nom, club, matchs_joues', (q) => q.eq('niveau', 'N1').eq('saison', SAISON));
  console.log(`${joueurs.length} joueur(s) N1 saison ${SAISON}, ${new Set(joueurs.map((j) => j.club)).size} club(s) distinct(s).\n`);

  // Compte matchs_joueur par joueur (toute la division N1, pagination par lots
  // ET par page : un lot de 50 joueurs cumule souvent plus de 1000 lignes
  // matchs_joueur — la limite de page par défaut de PostgREST/Supabase — sans
  // le .range() ci-dessous les lignes au-delà de la 1000e étaient tronquées
  // en silence, faisant croire à tort que certains joueurs du lot n'avaient
  // aucune ligne calendrier (mj=0.0) alors qu'ils en avaient 30 et plus).
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

  console.log('--- Moyenne matchs_joueur (lignes calendrier) et matchs_joues (stat réelle) par club ---');
  const stats = [...parClub.entries()].map(([club, liste]) => ({
    club,
    n: liste.length,
    moyenneMj: liste.reduce((a, b) => a + b.mj, 0) / liste.length,
    moyenneJoues: liste.reduce((a, b) => a + b.joues, 0) / liste.length,
  })).sort((a, b) => a.moyenneMj - b.moyenneMj);

  console.log('\nLes 15 clubs avec la moyenne matchs_joueur la plus basse :');
  stats.slice(0, 15).forEach((c) => console.log(`  ${c.club} (${c.n} joueur(s)) : moyenne matchs_joueur=${c.moyenneMj.toFixed(1)}, moyenne matchs_joues=${c.moyenneJoues.toFixed(1)}`));

  console.log('\nTous les clubs, triés par moyenne matchs_joueur croissante (pour vue d\'ensemble) :');
  stats.forEach((c) => console.log(`  ${c.club} : mj=${c.moyenneMj.toFixed(1)}, joues=${c.moyenneJoues.toFixed(1)}, n=${c.n}`));
}

main().finally(() => process.exit(process.exitCode || 0));
