// Diagnostic lecture seule : l'utilisateur signale des équipes N2 à
// matchs_joues=3 alors que seulement 2 journées ont été jouées cette
// saison. Hypothèse (déjà repérée plus tôt cette session, jamais corrigée) :
// des lignes calendrier_officiel EN DOUBLE avec des noms de club abrégés
// (ex: "Cesson", "Vannes", "Caen B") ont été recréées récemment en N2
// groupe C, dupliquant des lignes déjà existantes et déjà synchronisées
// (ex: id=855 "OC Cesson-Sévigné", id=857 "Vannes Oc 1", id=853 "Sm Caen 2").
// Si les deux lignes (originale + doublon) ont chacune des matchs_joueur
// avec minutes_jouees renseigné pour les mêmes joueurs, l'agrégat
// matchs_joues compte le même match réel deux fois.
//
// Ce script : repère, pour chaque groupe N2, les paires de lignes
// calendrier_officiel visiblement dupliquées (même date, mêmes 2 clubs vus
// via un rapprochement approximatif), vérifie si les deux ont des
// matchs_joueur avec minutes_jouees renseigné, et liste les joueurs
// impactés avec leur matchs_joues actuel en base.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const SAISON = '2026-2027';

function normaliserMot(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
const MOTS_GENERIQUES = new Set(['fc', 'ofc', 'afc', 'asc', 'ac', 'sc', 'csc', 'cs', 'us', 'uso', 'as', 'sm', 'sa', 'ta', 'ea', 'oc', 'af', 'vf', 'football', 'club', 'sporting', 'racing', 'stade', 'olympique', 'ol', 'd', '1', '2', 'sur', 'sous', 'en', 'la', 'le', 'les', 'de', 'du', 'des', 'saint', 'st', 'sainte', 'ste']);
function motsClub(s) {
  const mots = normaliserMot(s).split(' ').filter((w) => w.length > 1 && !MOTS_GENERIQUES.has(w));
  return mots.length ? mots : normaliserMot(s).split(' ').filter(Boolean);
}
function clubsProchesOuIdentiques(a, b) {
  const wa = motsClub(a), wb = motsClub(b);
  if (!wa.length || !wb.length) return false;
  const [small, big] = wa.length <= wb.length ? [wa, wb] : [wb, wa];
  return small.every((w) => big.some((w2) => w2 === w || (w.length >= 4 && w2.length >= 4 && (w2.startsWith(w) || w.startsWith(w2)))));
}

const { data: cal, error: errCal } = await supabase
  .from('calendrier_officiel')
  .select('id, groupe, date_match, equipe_domicile, equipe_exterieur')
  .eq('saison', SAISON).eq('division', 'N2').order('date_match');
if (errCal) { console.error('Erreur calendrier :', errCal.message); process.exit(1); }

const parGroupe = new Map();
for (const r of cal) {
  if (!parGroupe.has(r.groupe)) parGroupe.set(r.groupe, []);
  parGroupe.get(r.groupe).push(r);
}

const TOLERANCE_JOURS = 3;
function joursEcart(a, b) { return Math.abs((new Date(a).getTime() - new Date(b).getTime()) / 86400000); }

const paires = [];
for (const [groupe, lignes] of parGroupe) {
  for (let i = 0; i < lignes.length; i++) {
    for (let j = i + 1; j < lignes.length; j++) {
      const a = lignes[i], b = lignes[j];
      if (a.id === b.id) continue;
      if (joursEcart(a.date_match, b.date_match) > TOLERANCE_JOURS) continue;
      const memeSens = clubsProchesOuIdentiques(a.equipe_domicile, b.equipe_domicile) && clubsProchesOuIdentiques(a.equipe_exterieur, b.equipe_exterieur);
      if (memeSens) paires.push({ groupe, a, b });
    }
  }
}
console.log(`${paires.length} paire(s) de lignes calendrier_officiel N2 probablement dupliquées (même date ±${TOLERANCE_JOURS}j, mêmes clubs) :\n`);

for (const { groupe, a, b } of paires) {
  const { data: mjA } = await supabase.from('matchs_joueur').select('id, joueur_id, minutes_jouees').eq('calendrier_officiel_id', a.id);
  const { data: mjB } = await supabase.from('matchs_joueur').select('id, joueur_id, minutes_jouees').eq('calendrier_officiel_id', b.id);
  const avecMinutesA = (mjA || []).filter((m) => m.minutes_jouees != null).length;
  const avecMinutesB = (mjB || []).filter((m) => m.minutes_jouees != null).length;
  console.log(`Groupe ${groupe} — id=${a.id} "${a.equipe_domicile}" vs "${a.equipe_exterieur}" (${a.date_match}, ${avecMinutesA}/${(mjA || []).length} avec minutes) <-> id=${b.id} "${b.equipe_domicile}" vs "${b.equipe_exterieur}" (${b.date_match}, ${avecMinutesB}/${(mjB || []).length} avec minutes)`);

  if (avecMinutesA > 0 && avecMinutesB > 0) {
    // Les deux lignes ont des stats : risque réel de double comptage. Liste
    // les joueurs présents des deux côtés avec minutes renseignées.
    const idsA = new Set((mjA || []).filter((m) => m.minutes_jouees != null).map((m) => m.joueur_id));
    const idsB = new Set((mjB || []).filter((m) => m.minutes_jouees != null).map((m) => m.joueur_id));
    const communs = [...idsA].filter((id) => idsB.has(id));
    if (communs.length) {
      const { data: joueurs } = await supabase.from('joueurs').select('id, prenom, nom, club, matchs_joues').in('id', communs);
      console.log(`  ⚠ ${communs.length} joueur(s) avec minutes_jouees renseigné DES DEUX CÔTÉS (double comptage probable) :`);
      for (const j of joueurs || []) console.log(`    ${j.prenom} ${j.nom} (${j.club}) — matchs_joues actuel en base : ${j.matchs_joues}`);
    }
  }
  console.log('');
}
