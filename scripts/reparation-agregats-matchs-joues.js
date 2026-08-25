// Réparation : le diagnostic diagnostic-double-comptage-matchs-joues.js a
// confirmé que plusieurs joueurs (Nîmes, Bourges, Istres, Saumur, Canet...)
// avaient joueurs.matchs_joues doublé (2 au lieu de 1 match réellement
// joué), sans doublon de ligne matchs_joueur — cause : appliquerDeltaSaison
// dans lib-sync-lequipe-match-stats.js appliquait un delta lecture-
// modification-écriture non atomique, doublé par des synchros qui se sont
// chevauchées. Corrigé à la source (recalcul complet et idempotent), mais
// les données déjà faussées doivent être réparées une fois : recalcule les
// agrégats de saison de TOUS les joueurs ayant au moins un match joué,
// directement depuis les lignes matchs_joueur réelles, pour la saison en
// cours.
//
// DRY_RUN=true par défaut : logue les écarts trouvés sans rien écrire.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);

// Même logique que contributionMatch() dans lib-sync-lequipe-match-stats.js
// et footlight-modifier-profil.html.
function contributionMatch(m) {
  const n = (v) => (v == null ? 0 : v);
  const joue = m.minutes_jouees != null;
  return {
    matchs_joues: joue ? 1 : 0,
    titularisations: joue && m.titulaire === true ? 1 : 0,
    matchs_remplacant: joue && m.titulaire === false ? 1 : 0,
    buts: n(m.buts),
    passes_decisives: n(m.passes_decisives),
    minutes_jouees: n(m.minutes_jouees),
    cartons_jaunes: n(m.cartons_jaunes),
    cartons_rouges: n(m.cartons_rouges),
    buts_encaisses_avec: n(m.buts_encaisses_avec),
    clean_sheets: joue && !!m.clean_sheet ? 1 : 0,
  };
}

// ---- 1. Joueurs concernés : au moins un match avec minutes_jouees renseigné ----
const joueurIds = new Set();
{
  let from = 0;
  const page = 1000;
  for (;;) {
    const { data, error } = await supabase
      .from('matchs_joueur')
      .select('joueur_id')
      .not('minutes_jouees', 'is', null)
      .range(from, from + page - 1);
    if (error) { console.error('Erreur lecture matchs_joueur :', error.message); process.exit(1); }
    (data || []).forEach((r) => joueurIds.add(r.joueur_id));
    if (!data || data.length < page) break;
    from += page;
  }
}
console.log(`${joueurIds.size} joueur(s) avec au moins un match joué (minutes_jouees renseigné).`);

const CHAMPS = ['matchs_joues', 'titularisations', 'matchs_remplacant', 'buts', 'passes_decisives', 'minutes_jouees', 'cartons_jaunes', 'cartons_rouges', 'buts_encaisses_avec', 'clean_sheets'];

let ecarts = 0, corriges = 0;
for (const joueurId of joueurIds) {
  const { data: joueur, error: errJ } = await supabase
    .from('joueurs')
    .select(['id', 'prenom', 'nom', 'club', 'saison', ...CHAMPS].join(','))
    .eq('id', joueurId)
    .single();
  if (errJ || !joueur) continue;

  const { data: matchs, error: errM } = await supabase
    .from('matchs_joueur')
    .select('minutes_jouees, titulaire, buts, passes_decisives, cartons_jaunes, cartons_rouges, buts_encaisses_avec, clean_sheet')
    .eq('joueur_id', joueurId)
    .eq('saison', joueur.saison);
  if (errM) { console.error(`Erreur matchs pour ${joueur.prenom} ${joueur.nom} :`, errM.message); continue; }

  const totaux = (matchs || []).reduce((acc, m) => {
    const c = contributionMatch(m);
    Object.keys(c).forEach((k) => { acc[k] = (acc[k] || 0) + c[k]; });
    return acc;
  }, {});

  const diff = CHAMPS.filter((c) => (joueur[c] || 0) !== (totaux[c] || 0));
  if (!diff.length) continue;
  ecarts++;
  console.log(`${joueur.prenom} ${joueur.nom} (${joueur.club}) : ${diff.map((c) => `${c} ${joueur[c] || 0}->${totaux[c] || 0}`).join(', ')}`);
  if (!dryRun) {
    const { error: updErr } = await supabase.from('joueurs').update(totaux).eq('id', joueurId);
    if (updErr) console.error(`  Erreur écriture : ${updErr.message}`);
    else corriges++;
  }
}

console.log(`\nRésumé : ${ecarts} joueur(s) avec écart détecté, ${dryRun ? '0 (dry run)' : corriges} corrigé(s).`);
