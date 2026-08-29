// Corrige les stats du match Hyères F.C. (2) - FC Limonest Dardilly Saint
// Didier (2), National 1 groupe C journée 1 (21/08/2026), pour les joueurs
// inscrits côté Hyères sous le nom de club "Hyères 83 FC" (voir
// corrige-stats-hyeres-limonest-j1-fff.js, équivalent côté Limonest, pour
// le contexte complet). Source : feuille de match officielle FFF
// https://epreuves.fff.fr/competition/match/56635087-hyeres-f-c-football-club-limonest-dardilly-saint-didier/match
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const CALENDRIER_OFFICIEL_ID = 2800; // Hyères F.C. vs FCLDSD, 2026-08-21
const CLUB = 'Hyères 83 FC';
const SAISON = '2026-2027';
const SCORE_POUR = 2; // buts Hyères
const SCORE_CONTRE = 2; // buts Limonest

const JOUEURS_FFF = [
  { nom: 'Florian Andreani', titulaire: true, minutes: 90, buts: 0, cartons_jaunes: 0 },
  { nom: 'Yann Djabou', titulaire: true, minutes: 90, buts: 0, cartons_jaunes: 0 },
  { nom: 'Moussa Kouyaté', titulaire: true, minutes: 90, buts: 0, cartons_jaunes: 1 },
  { nom: 'Dylan Okyere', titulaire: true, minutes: 90, buts: 0, cartons_jaunes: 0 },
  { nom: 'Yohan Brun', titulaire: true, minutes: 75, buts: 0, cartons_jaunes: 0 },
  { nom: 'Axel Tressens', titulaire: true, minutes: 63, buts: 1, cartons_jaunes: 0 },
  { nom: 'Eric Mathieu', titulaire: true, minutes: 90, buts: 0, cartons_jaunes: 0 },
  { nom: 'Abdsamad Aniss', titulaire: true, minutes: 63, buts: 0, cartons_jaunes: 0 },
  { nom: 'Keny Moulet', titulaire: true, minutes: 90, buts: 0, cartons_jaunes: 0 },
  { nom: 'Alex Guett', titulaire: true, minutes: 90, buts: 0, cartons_jaunes: 0 },
  { nom: 'Laurenzo Monteiro', titulaire: true, minutes: 75, buts: 0, cartons_jaunes: 0 },
  { nom: 'Cheick Alan Diarra', titulaire: false, minutes: 27, buts: 0, cartons_jaunes: 0 },
  { nom: 'Tyrone Sakho', titulaire: false, minutes: 27, buts: 1, cartons_jaunes: 0 },
  { nom: 'Yanis Lasri', titulaire: false, minutes: 15, buts: 0, cartons_jaunes: 0 },
  { nom: 'Erwan Moutault', titulaire: false, minutes: 15, buts: 0, cartons_jaunes: 0 },
];

function normaliser(str) {
  return (str || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

async function main() {
  const { data: joueurs, error: errJ } = await supabase
    .from('joueurs')
    .select('id, prenom, nom')
    .eq('club', CLUB).eq('saison', SAISON);
  if (errJ) { console.error('Erreur joueurs :', errJ.message); process.exitCode = 1; return; }

  const parNomComplet = new Map(joueurs.map((j) => [normaliser(`${j.prenom} ${j.nom}`), j]));

  const correspondances = [];
  const nonTrouves = [];
  for (const f of JOUEURS_FFF) {
    const j = parNomComplet.get(normaliser(f.nom));
    if (j) correspondances.push({ ...f, joueur: j });
    else nonTrouves.push(f.nom);
  }
  console.log(`${correspondances.length}/${JOUEURS_FFF.length} joueur(s) FFF retrouvé(s) dans l'effectif FootLight de ${CLUB}.`);
  if (nonTrouves.length) console.log(`Non trouvé(s) : ${nonTrouves.join(', ')}`);

  const { data: mj, error: errMj } = await supabase
    .from('matchs_joueur')
    .select('id, joueur_id, saison, minutes_jouees, buts, titulaire')
    .eq('calendrier_officiel_id', CALENDRIER_OFFICIEL_ID)
    .in('joueur_id', correspondances.map((c) => c.joueur.id));
  if (errMj) { console.error('Erreur matchs_joueur :', errMj.message); process.exitCode = 1; return; }
  const mjParJoueur = new Map(mj.map((m) => [m.joueur_id, m]));

  for (const c of correspondances) {
    const ligne = mjParJoueur.get(c.joueur.id);
    if (!ligne) { console.log(`  ⚠️  ${c.joueur.prenom} ${c.joueur.nom} : aucune ligne matchs_joueur pour ce match, ignoré.`); continue; }
    console.log(`  ${dryRun ? 'À écrire' : 'Écriture'} : ${c.joueur.prenom} ${c.joueur.nom} — minutes_jouees=${c.minutes}, titulaire=${c.titulaire}, buts=${c.buts}, cartons_jaunes=${c.cartons_jaunes}, score=${SCORE_POUR}-${SCORE_CONTRE}`);
    if (!dryRun) {
      const { error } = await supabase.from('matchs_joueur').update({
        minutes_jouees: c.minutes,
        titulaire: c.titulaire,
        buts: c.buts,
        cartons_jaunes: c.cartons_jaunes,
        score_pour: SCORE_POUR,
        score_contre: SCORE_CONTRE,
        domicile: true,
      }).eq('id', ligne.id);
      if (error) { console.log(`    Erreur : ${error.message}`); continue; }

      const { data: tousMatchs } = await supabase
        .from('matchs_joueur')
        .select('minutes_jouees, titulaire, buts, passes_decisives, cartons_jaunes, cartons_rouges, buts_encaisses_avec, clean_sheet')
        .eq('joueur_id', c.joueur.id).eq('saison', SAISON);
      const totaux = (tousMatchs || []).reduce((acc, m) => {
        const n = (v) => (v == null ? 0 : v);
        const joue = m.minutes_jouees != null;
        acc.matchs_joues = (acc.matchs_joues || 0) + (joue ? 1 : 0);
        acc.titularisations = (acc.titularisations || 0) + (joue && m.titulaire === true ? 1 : 0);
        acc.matchs_remplacant = (acc.matchs_remplacant || 0) + (joue && m.titulaire === false ? 1 : 0);
        acc.buts = (acc.buts || 0) + n(m.buts);
        acc.passes_decisives = (acc.passes_decisives || 0) + n(m.passes_decisives);
        acc.minutes_jouees = (acc.minutes_jouees || 0) + n(m.minutes_jouees);
        acc.cartons_jaunes = (acc.cartons_jaunes || 0) + n(m.cartons_jaunes);
        acc.cartons_rouges = (acc.cartons_rouges || 0) + n(m.cartons_rouges);
        acc.buts_encaisses_avec = (acc.buts_encaisses_avec || 0) + n(m.buts_encaisses_avec);
        acc.clean_sheets = (acc.clean_sheets || 0) + (joue && !!m.clean_sheet ? 1 : 0);
        return acc;
      }, {});
      const { error: errUpdate } = await supabase.from('joueurs').update(totaux).eq('id', c.joueur.id);
      if (errUpdate) console.log(`    Erreur recalcul agrégats : ${errUpdate.message}`);
    }
  }

  console.log(`\nRésumé : ${correspondances.length} joueur(s) ${dryRun ? 'à mettre à jour' : 'mis à jour'}.`);
  if (dryRun) console.log('DRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
}

main().finally(() => process.exit(process.exitCode || 0));
