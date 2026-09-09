// Nettoyage ciblé : sync-transfermarkt-match-stats-n2.js traitait une
// composition "Probable" (prévisionnelle, publiée par Transfermarkt avant le
// coup d'envoi) comme une composition "Officielle" (confirmée après le
// match), et ne vérifiait jamais que la date du match n'était pas dans le
// futur — voir le garde-fou ajouté dans ce script (filtre sur AUJOURD_HUI).
// Conséquence : des lignes matchs_joueur ont reçu minutes_jouees=90,
// titulaire, buts, cartons_jaunes, cartons_rouges pour des matchs N2 pas
// encore joués (constaté par l'utilisateur sur plusieurs joueurs, ex.
// calendrier_officiel_id 703/873/875/877/881/885, journée du 19/09/2026 alors
// qu'on est le 09/09/2026).
//
// Ce script repère TOUTES les lignes matchs_joueur en National 2 dont la
// ligne calendrier_officiel liée a une date future, et pour lesquelles
// minutes_jouees est renseigné (donc écrites à tort par ce pipeline —
// seuls les 5 champs qu'il écrit sont concernés). Il les remet à null pour
// qu'elles soient re-synchronisées correctement une fois le match
// réellement joué, puis recalcule les agrégats saison des joueurs
// concernés (mêmes totaux que reparation-agregats-matchs-joues.js).
//
// Sécurité : DRY_RUN=true par défaut. Il faut positionner explicitement
// DRY_RUN=false pour écrire.
import { createClient } from '@supabase/supabase-js';

const DRY_RUN = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const SAISON = '2026-2027';
const AUJOURD_HUI = new Date().toISOString().slice(0, 10);
console.log(`Mode : ${DRY_RUN ? 'DRY_RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'} — date du jour : ${AUJOURD_HUI}\n`);

// ---- 1. Lignes calendrier_officiel N2 à date future (paginé, pas de limite implicite) ----
let calFutur = [];
{
  const PAGE = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('calendrier_officiel')
      .select('id, groupe, date_match, equipe_domicile, equipe_exterieur')
      .eq('division', 'N2').eq('saison', SAISON).gt('date_match', AUJOURD_HUI)
      .range(from, from + PAGE - 1);
    if (error) { console.error('Erreur calendrier_officiel :', error.message); process.exit(1); }
    calFutur = calFutur.concat(data || []);
    if (!data || data.length < PAGE) break;
    from += PAGE;
  }
}
console.log(`${calFutur.length} ligne(s) calendrier_officiel N2 à une date future (> ${AUJOURD_HUI}).\n`);
if (!calFutur.length) { console.log('Rien à nettoyer.'); process.exit(0); }

const calParId = new Map(calFutur.map((c) => [c.id, c]));
const idsFuturs = calFutur.map((c) => c.id);

// ---- 2. Lignes matchs_joueur liées, avec minutes_jouees renseigné ----
let mjPollues = [];
for (let i = 0; i < idsFuturs.length; i += 500) {
  const lot = idsFuturs.slice(i, i + 500);
  const { data, error } = await supabase
    .from('matchs_joueur')
    .select('id, joueur_id, calendrier_officiel_id, minutes_jouees, titulaire, buts, cartons_jaunes, cartons_rouges')
    .in('calendrier_officiel_id', lot)
    .not('minutes_jouees', 'is', null);
  if (error) { console.error('Erreur matchs_joueur :', error.message); process.exit(1); }
  mjPollues = mjPollues.concat(data || []);
}
console.log(`${mjPollues.length} ligne(s) matchs_joueur N2 à corriger (minutes_jouees renseigné pour un match futur).\n`);
if (!mjPollues.length) { console.log('Rien à nettoyer.'); process.exit(0); }

const joueurIds = [...new Set(mjPollues.map((m) => m.joueur_id))];
const { data: joueurs, error: errJ } = await supabase.from('joueurs').select('id, prenom, nom, club').in('id', joueurIds);
if (errJ) { console.error('Erreur joueurs :', errJ.message); process.exit(1); }
const joueurParId = new Map((joueurs || []).map((j) => [j.id, j]));

console.log('=== Détail des lignes à corriger ===');
for (const m of mjPollues) {
  const c = calParId.get(m.calendrier_officiel_id) || {};
  const j = joueurParId.get(m.joueur_id) || {};
  console.log(`  ${j.prenom || '?'} ${j.nom || '?'} (${j.club || '?'}) — groupe ${c.groupe} — ${c.date_match} "${c.equipe_domicile}" vs "${c.equipe_exterieur}" — minutes=${m.minutes_jouees} titulaire=${m.titulaire} buts=${m.buts} cj=${m.cartons_jaunes} cr=${m.cartons_rouges}`);
}

if (DRY_RUN) {
  console.log(`\nDRY_RUN : ${mjPollues.length} ligne(s) matchs_joueur seraient remises à null (minutes_jouees, titulaire, buts, cartons_jaunes, cartons_rouges) sur ${joueurIds.length} joueur(s), puis leurs agrégats saison recalculés. Relancer avec DRY_RUN=false pour écrire réellement.`);
  process.exit(0);
}

// ---- 3. Écriture réelle : remise à null, puis recalcul des agrégats ----
let totalCorrigees = 0, totalErreurs = 0;
for (const m of mjPollues) {
  const { error } = await supabase.from('matchs_joueur').update({
    minutes_jouees: null, titulaire: null, buts: null, cartons_jaunes: null, cartons_rouges: null,
  }).eq('id', m.id);
  if (error) { console.log(`  Erreur correction ligne id=${m.id} : ${error.message}`); totalErreurs++; continue; }
  totalCorrigees++;
}

let totalRecalcules = 0;
for (const joueurId of joueurIds) {
  const { data: tousMatchs, error: errTous } = await supabase
    .from('matchs_joueur')
    .select('minutes_jouees, titulaire, buts, passes_decisives, cartons_jaunes, cartons_rouges, buts_encaisses_avec, clean_sheet')
    .eq('joueur_id', joueurId).eq('saison', SAISON);
  if (errTous) { console.log(`  Erreur relecture matchs_joueur pour recalcul (joueur_id=${joueurId}) : ${errTous.message}`); continue; }
  const totaux = (tousMatchs || []).reduce((acc, mm) => {
    const n = (v) => (v == null ? 0 : v);
    const joue = mm.minutes_jouees != null;
    acc.matchs_joues = (acc.matchs_joues || 0) + (joue ? 1 : 0);
    acc.titularisations = (acc.titularisations || 0) + (joue && mm.titulaire === true ? 1 : 0);
    acc.matchs_remplacant = (acc.matchs_remplacant || 0) + (joue && mm.titulaire === false ? 1 : 0);
    acc.buts = (acc.buts || 0) + n(mm.buts);
    acc.passes_decisives = (acc.passes_decisives || 0) + n(mm.passes_decisives);
    acc.minutes_jouees = (acc.minutes_jouees || 0) + n(mm.minutes_jouees);
    acc.cartons_jaunes = (acc.cartons_jaunes || 0) + n(mm.cartons_jaunes);
    acc.cartons_rouges = (acc.cartons_rouges || 0) + n(mm.cartons_rouges);
    acc.buts_encaisses_avec = (acc.buts_encaisses_avec || 0) + n(mm.buts_encaisses_avec);
    acc.clean_sheets = (acc.clean_sheets || 0) + (joue && !!mm.clean_sheet ? 1 : 0);
    return acc;
  }, {});
  const { error: errAgg } = await supabase.from('joueurs').update(totaux).eq('id', joueurId);
  if (errAgg) { console.log(`  Erreur recalcul agrégats joueur_id=${joueurId} : ${errAgg.message}`); continue; }
  totalRecalcules++;
}

console.log(`\n========== Résumé ==========`);
console.log(`${totalCorrigees}/${mjPollues.length} ligne(s) matchs_joueur remises à null (${totalErreurs} erreur(s)).`);
console.log(`${totalRecalcules}/${joueurIds.length} joueur(s) recalculé(s).`);
