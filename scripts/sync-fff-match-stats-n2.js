// Synchronise les stats de match (minutes jouées, titulaire/remplaçant,
// buts, cartons) pour National 2 depuis epreuves.fff.fr, à la place de
// lequipe.fr qui n'a quasiment jamais de feuille de match détaillée pour
// ce niveau (voir diagnostic-stats-n2-globales.js / diagnostic-scan-clubs-n2.js
// : 100% des clubs N2 scannés à joues=0.0 malgré un calendrier généré).
//
// epreuves.fff.fr publie pour chaque match, dans le texte visible de la
// page (document.body.innerText) :
// - une section RÉSUMÉ : événements minute par minute (buts, cartons,
//   changements) ;
// - une section COMPOSITION : titulaires/remplaçants par équipe.
// Le parseur ci-dessous (parserPageMatch) est validé à 100% (12/12 valeurs
// correctes) sur le match Hyères/Limonest déjà connu — voir
// valide-parseur-fff-hyeres-limonest.js.
//
// Le calendrier (calendrier_officiel) est déjà alimenté correctement pour
// N2 via la synchro lequipe.fr existante (le calendrier n'est pas le
// problème, seules les stats détaillées manquent) : ce script rapproche
// donc chaque match FFF à une ligne calendrier_officiel EXISTANTE (mêmes
// équipes + même date), il n'en crée jamais.
//
// Rapprochement joueur FFF -> FootLight : par nom de famille (normalisé,
// tolérance de faute de frappe légère) UNIQUE au sein de l'effectif du
// club sur ce match. Le prénom n'est qu'une confirmation informative (les
// variantes comme "Yahya"/"Yaya" ou un nom composé partiellement omis
// sont fréquentes côté FFF) : un nom de famille ambigu (plusieurs
// correspondances) est ignoré et signalé, jamais deviné.
//
// Sécurité : DRY_RUN=true par défaut. N'écrit un champ matchs_joueur que
// s'il est encore vide (ne remplace jamais une stat déjà renseignée).
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const DRY_RUN = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const DIVISION = 'N2';
const SAISON = '2026-2027';
const CP_NO = '452037'; // National 2, toutes poules (voir decouverte-fff-n2-tous-groupes.js).
const PH_NO = '1';
const GROUPES_LETTRE_VERS_GPNO = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8 };

const GROUPE = (process.env.GROUPE || 'A').toUpperCase();
const gpNo = GROUPES_LETTRE_VERS_GPNO[GROUPE];
if (!gpNo) { console.error(`Groupe invalide : ${GROUPE} (attendu A-H).`); process.exit(1); }
// Limite le nombre de matchs traités par run (le parsing d'une page match
// prend ~2-4s ; un run complet peut vite atteindre le timeout du job).
const LIMITE_MATCHS = parseInt(process.env.LIMITE_MATCHS || '40', 10);

console.log(`Mode : ${DRY_RUN ? 'DRY_RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'} — National 2 groupe ${GROUPE} (gpNo=${gpNo}), limite ${LIMITE_MATCHS} match(s).\n`);

// ---- Rapprochement club (même logique que les autres scripts FFF) ----
function normaliserClub(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
const MOTS_GENERIQUES_CLUB = new Set(['fc', 'ofc', 'afc', 'asc', 'ac', 'sc', 'csc', 'cs', 'us', 'uso', 'as', 'sm', 'sa', 'vf', 'football', 'club', 'sporting', 'racing', 'stade', 'olympique', 'sur', 'sous', 'en', 'la', 'le', 'les', 'de', 'du', 'des']);
function motsClub(s) {
  const mots = normaliserClub(s).split(' ').filter(Boolean).filter((w) => !MOTS_GENERIQUES_CLUB.has(w));
  return mots.length ? mots : normaliserClub(s).split(' ').filter(Boolean);
}
function motsCorrespondent(a, b) {
  if (a === b) return true;
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
// Le nom FFF ("PRENOM[ PRENOM2] NOM[ NOM2...]") n'indique pas où le prénom
// s'arrête : teste chaque suffixe de mots comme nom de famille candidat.
function nomFamilleCorrespond(nomFffComplet, prenomJoueur, nomJoueur) {
  const motsFff = normaliserNom(nomFffComplet).split(' ').filter(Boolean);
  const nomCible = normaliserNom(nomJoueur);
  for (let debut = 1; debut < motsFff.length; debut++) {
    const candidat = motsFff.slice(debut).join(' ');
    const seuil = candidat.length >= 8 ? 2 : 1;
    if (distanceLevenshtein(candidat, nomCible) <= seuil) return true;
    // Nom composé côté FFF avec un mot supplémentaire (ex: "DAVIS ABANDA M'FOMO"
    // pour "Davis Abanda") : teste aussi le premier mot du candidat seul.
    const premierMot = candidat.split(' ')[0];
    if (premierMot && distanceLevenshtein(premierMot, nomCible) <= 1) return true;
  }
  return false;
}

// ---- Parseur page match (validé — voir valide-parseur-fff-hyeres-limonest.js) ----
function parserPageMatch(texteBrut, clubDomicile, clubExterieur) {
  const lignes = texteBrut.split('\n').map((l) => l.trim()).filter(Boolean);
  const idxResume = lignes.indexOf('RÉSUMÉ');
  const idxComposition = lignes.indexOf('COMPOSITION', idxResume === -1 ? 0 : idxResume);
  if (idxResume === -1 || idxComposition === -1) return null;

  const eventLignes = lignes.slice(idxResume + 1, idxComposition);
  const evenements = [];
  const reMinute = /^(\d+)(\+(\d+))?['’]$/;
  let i = 0;
  while (i < eventLignes.length) {
    const m = eventLignes[i].match(reMinute);
    if (!m) { i++; continue; }
    const minute = parseInt(m[1], 10) + (m[3] ? parseInt(m[3], 10) : 0);
    i++;
    const typeLigne = eventLignes[i] || '';
    if (typeLigne.startsWith('But pour ')) {
      i++;
      if (eventLignes[i] === 'inscrit par') i++;
      const nom = eventLignes[i]; i++;
      evenements.push({ minute, type: 'but', joueur: nom });
    } else if (typeLigne.startsWith('Avertissement pour ')) {
      i++;
      const nom = eventLignes[i]; i++;
      if (eventLignes[i] === 'est averti') i++;
      evenements.push({ minute, type: 'jaune', joueur: nom });
    } else if (typeLigne.startsWith('Exclusion pour ') || /carton rouge/i.test(typeLigne)) {
      i++;
      const nom = eventLignes[i]; i++;
      evenements.push({ minute, type: 'rouge', joueur: nom });
    } else if (typeLigne.startsWith('Changement pour ')) {
      i++;
      const entre = eventLignes[i]; i++;
      if (eventLignes[i] === 'remplace') i++;
      const sort = eventLignes[i]; i++;
      evenements.push({ minute, type: 'changement', entre, sort });
    } else {
      i++;
    }
  }

  const compoLignes = lignes.slice(idxComposition + 1);
  const composition = [];
  let clubCourant = null;
  let sousListe = null;
  const reNumero = /^\d+$/;
  for (let j = 0; j < compoLignes.length; j++) {
    const l = compoLignes[j];
    if (l === 'LIEU DE LA RENCONTRE') break;
    if (l === clubDomicile || l === clubExterieur) { clubCourant = l; sousListe = null; continue; }
    if (l === 'TITULAIRES') { sousListe = 'titulaires'; continue; }
    if (l === 'REMPLAÇANTS') { sousListe = 'remplacants'; continue; }
    if (reNumero.test(l) && sousListe && clubCourant) {
      const nom = compoLignes[j + 1];
      if (nom) { composition.push({ nomAffiche: nom, club: clubCourant, titulaire: sousListe === 'titulaires' }); j++; }
    }
  }
  if (!composition.length) return null;

  const resultats = new Map(); // nomAffiche -> stats
  for (const c of composition) {
    resultats.set(c.nomAffiche, { nomAffiche: c.nomAffiche, club: c.club, titulaire: c.titulaire, minutes: c.titulaire ? 90 : 0, buts: 0, cartonsJaunes: 0, cartonsRouges: 0 });
  }
  const trouveParNom = (nom) => resultats.get(nom) || [...resultats.values()].find((r) => r.nomAffiche === nom);
  for (const ev of evenements) {
    if (ev.type === 'but') { const r = trouveParNom(ev.joueur); if (r) r.buts++; }
    else if (ev.type === 'jaune') { const r = trouveParNom(ev.joueur); if (r) r.cartonsJaunes++; }
    else if (ev.type === 'rouge') { const r = trouveParNom(ev.joueur); if (r) r.cartonsRouges++; }
    else if (ev.type === 'changement') {
      const rOut = trouveParNom(ev.sort);
      const rIn = trouveParNom(ev.entre);
      if (rOut) rOut.minutes = ev.minute;
      if (rIn) rIn.minutes = 90 - ev.minute;
    }
  }
  return [...resultats.values()];
}

// ---- 1. Capture du jeton x-competition + liste des matchs de la saison ----
const browser = await chromium.launch(process.env.PW_EXECUTABLE_PATH ? { executablePath: process.env.PW_EXECUTABLE_PATH } : {});
const pageJeton = await browser.newPage({ locale: 'fr-FR' });
let jeton = null;
pageJeton.on('request', (req) => {
  if (req.url().includes('/api/data/matches') && !jeton) jeton = req.headers()['x-competition'] || null;
});
await pageJeton.goto(`https://epreuves.fff.fr/competition/engagement/3-n2/phase/1/${gpNo}/resultats-et-calendrier`, { waitUntil: 'networkidle', timeout: 60000 });
await pageJeton.waitForTimeout(1000);
if (!jeton) { console.error('Jeton x-competition introuvable, abandon.'); await browser.close(); process.exit(1); }

async function appelerApi(dateDebut, dateFin) {
  const url = `https://epreuves.fff.fr/api/data/matches?cpNo=${CP_NO}&phNo=${PH_NO}&gpNo=${gpNo}&dateDebut=${encodeURIComponent(dateDebut.toISOString())}&dateFin=${encodeURIComponent(dateFin.toISOString())}&itemsPerPage=200&page=1&pagination=true`;
  return pageJeton.evaluate(async ({ u, xc }) => {
    try {
      const r = await fetch(u, { headers: { Accept: 'application/json, text/plain, */*', 'x-competition': xc } });
      const texte = await r.text();
      if (r.status !== 200) return { statut: r.status };
      return { statut: 200, membres: JSON.parse(texte)['hydra:member'] || [] };
    } catch (err) { return { statut: 0, erreur: String(err) }; }
  }, { u: url, xc: jeton });
}

const DEBUT_SAISON = new Date('2026-07-01T00:00:00Z');
const AUJOURD_HUI = new Date();
const JOURS_PAR_TRANCHE = 14;
const matchsFff = [];
let curseur = new Date(DEBUT_SAISON);
while (curseur < AUJOURD_HUI) {
  const fin = new Date(Math.min(curseur.getTime() + JOURS_PAR_TRANCHE * 86400000, AUJOURD_HUI.getTime()));
  const resultat = await appelerApi(curseur, fin);
  if (resultat.statut === 200) {
    for (const m of resultat.membres) {
      const df = m.donneesFormatees;
      if (df?.joue && df?.recevant?.club?.nom && df?.visiteur?.club?.nom && df?.date) {
        matchsFff.push({ id: m.id, domicile: df.recevant.club.nom, exterieur: df.visiteur.club.nom, date: df.date.slice(0, 10) });
      }
    }
  }
  curseur = fin;
  await pageJeton.waitForTimeout(300);
}
console.log(`${matchsFff.length} match(s) joué(s) trouvé(s) côté FFF (National 2 groupe ${GROUPE}).`);

// ---- 2. Rapproche chaque match FFF à une ligne calendrier_officiel existante ----
const { data: calendrier, error: errCal } = await supabase
  .from('calendrier_officiel')
  .select('id, equipe_domicile, equipe_exterieur, date_match')
  .eq('division', DIVISION).eq('groupe', GROUPE).eq('saison', SAISON);
if (errCal) { console.error('Erreur lecture calendrier_officiel :', errCal.message); await browser.close(); process.exit(1); }

// Tolérance de ±3 jours (et non une égalité stricte de date) : la date
// FFF et date_match (issue de la synchro calendrier lequipe.fr) peuvent
// diverger de 1-3 jours pour le même match réel — décalage déjà rencontré
// à de multiples reprises sur National 1 cette session. Choisit, parmi les
// lignes candidates (mêmes équipes), celle dont la date est la plus proche.
const TOLERANCE_JOURS = 3;
function joursEcart(a, b) {
  return Math.abs((new Date(a).getTime() - new Date(b).getTime()) / 86400000);
}
const matchsARapprocher = [];
for (const m of matchsFff) {
  const candidates = (calendrier || []).filter((c) => joursEcart(c.date_match, m.date) <= TOLERANCE_JOURS && clubsCorrespondent(c.equipe_domicile, m.domicile) && clubsCorrespondent(c.equipe_exterieur, m.exterieur));
  const ligne = candidates.sort((a, b) => joursEcart(a.date_match, m.date) - joursEcart(b.date_match, m.date))[0];
  if (ligne) matchsARapprocher.push({ ...m, calendrierOfficielId: ligne.id, equipeDomicileCal: ligne.equipe_domicile, equipeExterieurCal: ligne.equipe_exterieur });
}
console.log(`${matchsARapprocher.length}/${matchsFff.length} match(s) FFF rapproché(s) à une ligne calendrier_officiel existante.`);

// ---- 3. Ne garde que les matchs pas encore synchronisés (au moins une ligne matchs_joueur sans minutes_jouees) ----
const idsCandidats = matchsARapprocher.map((m) => m.calendrierOfficielId);
let mjExistants = [];
for (let i = 0; i < idsCandidats.length; i += 100) {
  const lot = idsCandidats.slice(i, i + 100);
  if (!lot.length) continue;
  const { data, error } = await supabase.from('matchs_joueur').select('id, joueur_id, calendrier_officiel_id, minutes_jouees').in('calendrier_officiel_id', lot);
  if (error) { console.error('Erreur lecture matchs_joueur :', error.message); await browser.close(); process.exit(1); }
  mjExistants = mjExistants.concat(data || []);
}
const parCalendrierId = new Map();
for (const mj of mjExistants) {
  if (!parCalendrierId.has(mj.calendrier_officiel_id)) parCalendrierId.set(mj.calendrier_officiel_id, []);
  parCalendrierId.get(mj.calendrier_officiel_id).push(mj);
}
const matchsAsynchroniser = matchsARapprocher.filter((m) => {
  const lignes = parCalendrierId.get(m.calendrierOfficielId) || [];
  return lignes.length && lignes.some((l) => l.minutes_jouees == null);
}).slice(0, LIMITE_MATCHS);
console.log(`${matchsAsynchroniser.length} match(s) à synchroniser ce run (limite ${LIMITE_MATCHS}).\n`);

// ---- 4. Pour chaque match : charge la page, parse, rapproche les joueurs, écrit ----
let totalMaj = 0, totalAmbigus = 0, totalNonTrouves = 0;
const pageMatch = await browser.newPage({ locale: 'fr-FR' });
for (const m of matchsAsynchroniser) {
  const url = `https://epreuves.fff.fr/competition/match/${m.id}/match`;
  console.log(`--- ${m.date} — ${m.equipeDomicileCal} vs ${m.equipeExterieurCal} (calendrier_officiel_id=${m.calendrierOfficielId}) ---`);
  let texte;
  try {
    await pageMatch.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
    await pageMatch.waitForTimeout(1200);
    texte = await pageMatch.evaluate(() => document.body.innerText);
  } catch (e) { console.log(`  Erreur chargement page : ${e.message}`); continue; }

  const resultatsParseur = parserPageMatch(texte, m.equipeDomicileCal, m.equipeExterieurCal)
    || parserPageMatch(texte, m.domicile, m.exterieur);
  if (!resultatsParseur) { console.log('  Sections RÉSUMÉ/COMPOSITION introuvables ou vides, match ignoré.'); continue; }

  const lignesMj = parCalendrierId.get(m.calendrierOfficielId) || [];
  const joueurIds = lignesMj.map((l) => l.joueur_id);
  const { data: joueurs, error: errJ } = await supabase.from('joueurs').select('id, prenom, nom, club').in('id', joueurIds);
  if (errJ) { console.log(`  Erreur lecture joueurs : ${errJ.message}`); continue; }

  for (const r of resultatsParseur) {
    // Ne considère que les joueurs FootLight du bon club pour ce match.
    const candidatsClub = joueurs.filter((j) => clubsCorrespondent(j.club, r.club));
    const correspondances = candidatsClub.filter((j) => nomFamilleCorrespond(r.nomAffiche, j.prenom, j.nom));
    if (correspondances.length === 0) { totalNonTrouves++; continue; }
    if (correspondances.length > 1) {
      console.log(`  Ambiguïté : "${r.nomAffiche}" correspond à ${correspondances.length} joueurs FootLight (${correspondances.map((j) => `${j.prenom} ${j.nom}`).join(', ')}), ignoré.`);
      totalAmbigus++;
      continue;
    }
    const joueur = correspondances[0];
    const ligneMj = lignesMj.find((l) => l.joueur_id === joueur.id);
    if (!ligneMj) continue;
    if (ligneMj.minutes_jouees != null) continue; // déjà renseigné, jamais écrasé.
    // Un remplaçant jamais entré (minutes=0, non titulaire) n'a pas joué : ne rien écrire.
    if (!r.titulaire && r.minutes === 0) continue;

    console.log(`  ${DRY_RUN ? 'À écrire' : 'Écriture'} : ${joueur.prenom} ${joueur.nom} (FFF: ${r.nomAffiche}) — minutes=${r.minutes}, titulaire=${r.titulaire}, buts=${r.buts}, jaunes=${r.cartonsJaunes}, rouges=${r.cartonsRouges}`);
    totalMaj++;
    if (!DRY_RUN) {
      const { error: errUpd } = await supabase.from('matchs_joueur').update({
        minutes_jouees: r.minutes, titulaire: r.titulaire, buts: r.buts,
        cartons_jaunes: r.cartonsJaunes, cartons_rouges: r.cartonsRouges,
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
}
await browser.close();

console.log(`\n========== Résumé (National 2 groupe ${GROUPE}) ==========`);
console.log(`${matchsAsynchroniser.length} match(s) traité(s), ${totalMaj} mise(s) à jour ${DRY_RUN ? 'proposée(s)' : 'effectuée(s)'}, ${totalAmbigus} ambiguïté(s) ignorée(s), ${totalNonTrouves} joueur(s) FFF non retrouvé(s) côté FootLight.`);
if (DRY_RUN) console.log('DRY_RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
