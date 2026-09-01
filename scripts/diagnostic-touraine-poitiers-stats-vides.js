// Diagnostic lecture seule : Union Foot de Touraine (et variantes) a joues=0.0 pour tous ses joueurs
// malgré des lignes calendrier normalement peuplées (mj~16-20). Objectif : comprendre pourquoi
// aucune stat n'a jamais été synchronisée pour ce club, avant toute correction.
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://qcxarfmxctznxngjagrz.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY manquant.');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CLUBS = ['Union Foot de Touraine', 'UNION FOOT TOURAINE'];

async function fetchToutesPages(table, colonnes, filtreFn) {
  let toutes = [];
  let page = 0;
  const TAILLE = 1000;
  while (true) {
    let requete = supabase.from(table).select(colonnes).range(page * TAILLE, (page + 1) * TAILLE - 1);
    if (filtreFn) requete = filtreFn(requete);
    const { data, error } = await requete;
    if (error) throw error;
    toutes = toutes.concat(data);
    if (data.length < TAILLE) break;
    page++;
  }
  return toutes;
}

async function main() {
  for (const club of CLUBS) {
    console.log(`\n=== ${club} ===`);
    const { data: joueurs, error } = await supabase
      .from('joueurs')
      .select('id, nom, prenom, club, niveau, division, groupe, matchs_joues')
      .eq('club', club)
      .eq('saison', '2026-2027');
    if (error) throw error;
    console.log(`${joueurs.length} joueur(s) trouvé(s).`);
    if (!joueurs.length) continue;

    const divisions = new Set(joueurs.map((j) => `${j.division}::${j.groupe}::${j.niveau}`));
    console.log('Division/groupe/niveau distincts :', [...divisions].join(' | '));

    for (const j of joueurs.slice(0, 5)) {
      const { data: mj, error: errMj } = await supabase
        .from('matchs_joueur')
        .select('id, date_match, adversaire, score_pour, score_contre, minutes_jouees, calendrier_officiel_id')
        .eq('joueur_id', j.id)
        .order('date_match', { ascending: true })
        .limit(5);
      if (errMj) throw errMj;
      console.log(`  ${j.prenom} ${j.nom} (id=${j.id}, matchs_joues=${j.matchs_joues}) — ${mj.length} ligne(s) matchs_joueur (échantillon) :`);
      for (const m of mj) {
        console.log(`    date=${m.date_match} adv=${m.adversaire} score=${m.score_pour}-${m.score_contre} min=${m.minutes_jouees} cal_id=${m.calendrier_officiel_id}`);
      }
    }
  }

  console.log('\n--- Recherche calendrier_officiel N1 correspondant à "touraine" ---');
  const calendrier = await fetchToutesPages(
    'calendrier_officiel',
    'id, division, groupe, journee, date_match, equipe_domicile, equipe_exterieur',
    (r) => r.eq('division', 'National 1').eq('saison', '2026-2027')
  );
  const matches = calendrier.filter((c) => /touraine/i.test(c.equipe_domicile) || /touraine/i.test(c.equipe_exterieur));
  console.log(`${matches.length} ligne(s) calendrier trouvée(s) pour "touraine".`);
  for (const m of matches.slice(0, 15)) {
    console.log(`  id=${m.id} groupe=${m.groupe} j${m.journee} ${m.date_match} ${m.equipe_domicile} vs ${m.equipe_exterieur}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
