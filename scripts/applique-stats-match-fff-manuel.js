// Applique à matchs_joueur les stats d'un match lues manuellement sur une
// feuille de match epreuves.fff.fr (capture d'écran fournie par
// l'utilisateur, lue puis structurée par Claude) — contournement légitime
// du blocage anti-bot FFF constaté sur les runners GitHub Actions (voir
// sync-fff-match-stats-n2-scheduled.yml) : c'est l'utilisateur qui navigue
// normalement depuis son propre poste, jamais un script automatisé.
//
// Réutilise le même rapprochement club/joueur que sync-fff-match-stats-n2.js
// (mots génériques, tolérance de préfixe, distance de Levenshtein sur le nom
// de famille) et les mêmes garde-fous : n'écrit un champ matchs_joueur que
// s'il est encore vide, un remplaçant jamais entré n'a pas joué.
//
// Entrée : variable d'environnement DONNEES_JSON, JSON de la forme
// { "calendrierOfficielId": 497, "joueurs": [
//     { "nomAffiche": "Gabin Legrand", "club": "US COLOMIERS",
//       "titulaire": true, "minutes": 86, "buts": 1, "cartonsJaunes": 0,
//       "cartonsRouges": 0 }, ... ] }
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const DRY_RUN = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const SAISON = '2026-2027';
console.log(`Mode : ${DRY_RUN ? 'DRY_RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}\n`);

let donnees;
try {
  donnees = JSON.parse(process.env.DONNEES_JSON || '');
} catch (e) {
  console.error(`DONNEES_JSON invalide : ${e.message}`); process.exit(1);
}
if (!donnees?.calendrierOfficielId || !Array.isArray(donnees.joueurs) || !donnees.joueurs.length) {
  console.error('DONNEES_JSON doit contenir calendrierOfficielId et un tableau joueurs non vide.'); process.exit(1);
}

// ---- Rapprochement club (même logique que sync-fff-match-stats-n2.js) ----
function normaliserClub(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
const MOTS_GENERIQUES_CLUB = new Set(['fc', 'ofc', 'afc', 'asc', 'ac', 'sc', 'csc', 'cs', 'us', 'uso', 'as', 'sm', 'sa', 'vf', 'football', 'club', 'sporting', 'racing', 'stade', 'olympique', 'ol', 'd', '1', 'sur', 'sous', 'en', 'la', 'le', 'les', 'de', 'du', 'des']);
const MOTS_REMPLACEMENT_CLUB = { st: 'saint', ste: 'sainte', gd: 'grand' };
function motsClub(s) {
  const mots = normaliserClub(s).split(' ').filter(Boolean).map((w) => MOTS_REMPLACEMENT_CLUB[w] || w).filter((w) => !MOTS_GENERIQUES_CLUB.has(w));
  return mots.length ? mots : normaliserClub(s).split(' ').filter(Boolean);
}
const LETTRE_VERS_CHIFFRE_RESERVE = { b: '2', c: '3', d: '4', e: '5', f: '6', g: '7', h: '8' };
function canonicaliserMot(w) {
  return LETTRE_VERS_CHIFFRE_RESERVE[w] || w;
}
function motsCorrespondent(a, b) {
  const ca = canonicaliserMot(a), cb = canonicaliserMot(b);
  if (ca === cb) return true;
  const [court, long] = a.length <= b.length ? [a, b] : [b, a];
  return court.length >= 4 && long.startsWith(court);
}
function clubsCorrespondent(a, b) {
  const wa = motsClub(a), wb = motsClub(b);
  if (!wa.length || !wb.length) return false;
  const [small, big] = wa.length <= wb.length ? [wa, wb] : [wb, wa];
  for (const w of small) if (!big.some((w2) => motsCorrespondent(w, w2))) return false;
  return true;
}

// ---- Rapprochement joueur (nom de famille, tolérance légère) ----
function normaliserNom(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]+/g, ' ').trim();
}
function distanceLevenshtein(a, b) {
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      d[i][j] = a[i - 1] === b[j - 1] ? d[i - 1][j - 1] : 1 + Math.min(d[i - 1][j], d[i][j - 1], d[i - 1][j - 1]);
    }
  }
  return d[m][n];
}
function nomFamilleCorrespond(nomFffComplet, nomJoueur) {
  const motsFff = normaliserNom(nomFffComplet).split(' ').filter(Boolean);
  const nomCible = normaliserNom(nomJoueur);
  for (let debut = 1; debut < motsFff.length; debut++) {
    const candidat = motsFff.slice(debut).join(' ');
    const seuil = candidat.length >= 8 ? 2 : 1;
    if (distanceLevenshtein(candidat, nomCible) <= seuil) return true;
    const premierMot = candidat.split(' ')[0];
    if (premierMot && distanceLevenshtein(premierMot, nomCible) <= 1) return true;
  }
  return false;
}

// ---- 1. Vérifie que la ligne calendrier_officiel existe ----
const { data: ligneCal, error: errCal } = await supabase
  .from('calendrier_officiel')
  .select('id, division, groupe, saison, date_match, equipe_domicile, equipe_exterieur')
  .eq('id', donnees.calendrierOfficielId).maybeSingle();
if (errCal) { console.error('Erreur lecture calendrier_officiel :', errCal.message); process.exit(1); }
if (!ligneCal) { console.error(`calendrier_officiel id=${donnees.calendrierOfficielId} introuvable.`); process.exit(1); }
console.log(`Match : ${ligneCal.equipe_domicile} vs ${ligneCal.equipe_exterieur} (${ligneCal.date_match}, ${ligneCal.division} groupe ${ligneCal.groupe})\n`);

// ---- 2. Charge les matchs_joueur existants + joueurs associés ----
const { data: lignesMj, error: errMj } = await supabase
  .from('matchs_joueur')
  .select('id, joueur_id, minutes_jouees')
  .eq('calendrier_officiel_id', ligneCal.id);
if (errMj) { console.error('Erreur lecture matchs_joueur :', errMj.message); process.exit(1); }
if (!lignesMj?.length) { console.error('Aucune ligne matchs_joueur pour ce match (calendrier vide côté effectif).'); process.exit(1); }

const joueurIds = lignesMj.map((l) => l.joueur_id);
const { data: joueurs, error: errJ } = await supabase.from('joueurs').select('id, prenom, nom, club').in('id', joueurIds);
if (errJ) { console.error('Erreur lecture joueurs :', errJ.message); process.exit(1); }

// ---- 3. Rapproche chaque entrée fournie à un joueur FootLight, puis écrit ----
let totalMaj = 0, totalAmbigus = 0, totalNonTrouves = 0, totalDejaRenseignes = 0, totalIgnoresNonEntres = 0;
for (const r of donnees.joueurs) {
  const candidatsClub = joueurs.filter((j) => clubsCorrespondent(j.club, r.club));
  const correspondances = candidatsClub.filter((j) => nomFamilleCorrespond(r.nomAffiche, j.nom));
  if (correspondances.length === 0) {
    console.log(`  Non trouvé : "${r.nomAffiche}" (${r.club})`);
    totalNonTrouves++; continue;
  }
  if (correspondances.length > 1) {
    console.log(`  Ambiguïté : "${r.nomAffiche}" correspond à ${correspondances.length} joueurs FootLight (${correspondances.map((j) => `${j.prenom} ${j.nom}`).join(', ')}), ignoré.`);
    totalAmbigus++; continue;
  }
  const joueur = correspondances[0];
  const ligneMj = lignesMj.find((l) => l.joueur_id === joueur.id);
  if (!ligneMj) { console.log(`  "${r.nomAffiche}" -> ${joueur.prenom} ${joueur.nom} : pas de ligne matchs_joueur pour ce match, ignoré.`); continue; }
  if (ligneMj.minutes_jouees != null) { totalDejaRenseignes++; continue; } // déjà renseigné, jamais écrasé.
  if (!r.titulaire && (r.minutes || 0) === 0) { totalIgnoresNonEntres++; continue; } // remplaçant jamais entré.

  console.log(`  ${DRY_RUN ? 'À écrire' : 'Écriture'} : ${joueur.prenom} ${joueur.nom} (FFF: ${r.nomAffiche}) — minutes=${r.minutes}, titulaire=${!!r.titulaire}, buts=${r.buts || 0}, jaunes=${r.cartonsJaunes || 0}, rouges=${r.cartonsRouges || 0}`);
  totalMaj++;
  if (!DRY_RUN) {
    const { error: errUpd } = await supabase.from('matchs_joueur').update({
      minutes_jouees: r.minutes, titulaire: !!r.titulaire, buts: r.buts || 0,
      cartons_jaunes: r.cartonsJaunes || 0, cartons_rouges: r.cartonsRouges || 0,
    }).eq('id', ligneMj.id);
    if (errUpd) { console.log(`    Erreur écriture : ${errUpd.message}`); continue; }

    const { data: tousMatchs } = await supabase
      .from('matchs_joueur')
      .select('minutes_jouees, titulaire, buts, passes_decisives, cartons_jaunes, cartons_rouges, buts_encaisses_avec, clean_sheet')
      .eq('joueur_id', joueur.id).eq('saison', SAISON);
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
    const { error: errAgg } = await supabase.from('joueurs').update(totaux).eq('id', joueur.id);
    if (errAgg) console.log(`    Erreur recalcul agrégats : ${errAgg.message}`);
  }
}

console.log(`\n========== Résumé ==========`);
console.log(`${totalMaj} mise(s) à jour ${DRY_RUN ? 'proposée(s)' : 'effectuée(s)'}, ${totalDejaRenseignes} déjà renseignée(s) (ignorée(s)), ${totalIgnoresNonEntres} remplaçant(s) jamais entré(s) (ignoré(s)), ${totalAmbigus} ambiguïté(s), ${totalNonTrouves} joueur(s) non trouvé(s).`);
if (DRY_RUN) console.log('DRY_RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
