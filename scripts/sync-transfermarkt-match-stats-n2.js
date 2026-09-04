// Synchronise les stats de match (minutes jouées, titulaire/remplaçant,
// buts, cartons) pour National 2 depuis transfermarkt.fr, en secours de
// epreuves.fff.fr qui bloque le trafic automatisé (datacenter) depuis le
// 2026-09-02 — voir diagnostic-fff-portee-blocage.js (403 sur tout le
// domaine fff.fr pour les requêtes automatisées, alors qu'un accès
// humain normal fonctionne : politique anti-bot, pas une panne).
//
// Transfermarkt est un site indépendant de FFF (aucun lien entre les
// deux), qui publie pour les mêmes matchs réels de National 2 :
// - une page "spieltag" (calendrier de journée) par groupe, sous un code
//   wettbewerb propre à Transfermarkt (FR5<lettre> ~ groupe <lettre>,
//   confirmé par le titre réel de plusieurs feuilles de match — le slug
//   décoratif de l'URL n'est PAS fiable, voir diagnostic-transfermarkt-*
//   supprimés) ;
// - une page "spielbericht" (feuille de match) par match, avec :
//   - 2 <table> de composition (postes -> joueurs titulaires) ;
//   - des lignes .sb-aktion (une par but/carton/remplacement), club +
//     joueur(s) + type d'événement en texte clair (pas de sprite ici) ;
//   - une timeline .sb-leiste-ereignis (une par équipe) où chaque
//     événement a une position CSS ("left: X%") sur 90 minutes — SEULE
//     source de la minute, qui reste donc approximative (arrondie),
//     Transfermarkt encodant la minute réelle uniquement via un sprite
//     CSS (aucun texte brut, y compris via son endpoint AJAX par
//     événement, vérifié). Corrélation .sb-aktion <-> timeline : par
//     équipe et par ordre d'apparition dans le DOM (les deux structures
//     sont rendues depuis le même tableau d'événements, donc dans le
//     même ordre chronologique au sein d'une même équipe).
//
// Le calendrier (calendrier_officiel) est déjà alimenté pour N2 : ce
// script rapproche chaque match Transfermarkt à une ligne EXISTANTE
// (mêmes équipes + même date, tolérance ±3 jours), il n'en crée jamais.
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
const SAISON_ID_TM = '2026';
const GROUPE = (process.env.GROUPE || 'E').toUpperCase();
const WETTBEWERB = `FR5${GROUPE}`;
const NB_JOURNEES = parseInt(process.env.NB_JOURNEES || '3', 10);
const LIMITE_MATCHS = parseInt(process.env.LIMITE_MATCHS || '20', 10);

console.log(`Mode : ${DRY_RUN ? 'DRY_RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'} — National 2 groupe ${GROUPE} (wettbewerb=${WETTBEWERB}) via Transfermarkt, ${NB_JOURNEES} journée(s), limite ${LIMITE_MATCHS} match(s).\n`);

// ---- Rapprochement club (même logique que sync-fff-match-stats-n2.js) ----
function normaliserClub(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
const MOTS_GENERIQUES_CLUB = new Set(['fc', 'ofc', 'afc', 'asc', 'ac', 'sc', 'csc', 'cs', 'us', 'uso', 'as', 'sm', 'sa', 'vf', 'football', 'club', 'sporting', 'racing', 'stade', 'olympique', 'ol', 'd', '1', '2', 'sur', 'sous', 'en', 'la', 'le', 'les', 'de', 'du', 'des', 'ea']);
const MOTS_REMPLACEMENT_CLUB = { st: 'saint', ste: 'sainte', gd: 'grand' };
function motsClub(s) {
  const mots = normaliserClub(s).split(' ').filter(Boolean).map((w) => MOTS_REMPLACEMENT_CLUB[w] || w).filter((w) => !MOTS_GENERIQUES_CLUB.has(w));
  return mots.length ? mots : normaliserClub(s).split(' ').filter(Boolean);
}
const LETTRE_VERS_CHIFFRE_RESERVE = { b: '2', c: '3', d: '4', e: '5', f: '6', g: '7', h: '8' };
function canonicaliserMot(w) { return LETTRE_VERS_CHIFFRE_RESERVE[w] || w; }
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
// Transfermarkt affiche "P. Nom" (initiale du prénom). Compare juste le
// nom de famille (dernier mot affiché), tolérance légère.
function nomFamilleCorrespond(nomAffiche, nomJoueur) {
  const mots = normaliserNom(nomAffiche).split(' ').filter(Boolean);
  if (!mots.length) return false;
  const candidat = mots[mots.length - 1];
  const cible = normaliserNom(nomJoueur);
  // Un candidat trop court (ex. "b" venant d'un nom de club mal capturé
  // comme "FC Metz B") matche par erreur presque tout nom via la
  // tolérance Levenshtein — on exige alors une égalité stricte.
  if (candidat.length < 3) return candidat === cible;
  const seuil = candidat.length >= 8 ? 2 : 1;
  return distanceLevenshtein(candidat, cible) <= seuil;
}

// ---- 1. Découvre les matchs joués (parcourt les journées de la page spieltag) ----
const browser = await chromium.launch(process.env.PW_EXECUTABLE_PATH ? { executablePath: process.env.PW_EXECUTABLE_PATH } : {});
const page = await browser.newPage({ locale: 'fr-FR', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36' });

const matchsTm = []; // { id, url, domicile, exterieur, date }
for (let journee = 1; journee <= NB_JOURNEES; journee++) {
  const urlJournee = `https://www.transfermarkt.fr/national-2/spieltag/wettbewerb/${WETTBEWERB}/saison_id/${SAISON_ID_TM}/spieltag/${journee}`;
  try {
    await page.goto(urlJournee, { waitUntil: 'networkidle', timeout: 45000 });
  } catch (e) { console.log(`Journée ${journee} : erreur navigation (${e.message.split('\n')[0]}), ignorée.`); continue; }

  const infosMatchs = await page.evaluate(() => {
    const liens = [...document.querySelectorAll('a[href*="/spielbericht/index/spielbericht/"]')];
    const uniques = new Map();
    for (const a of liens) {
      const href = a.getAttribute('href');
      if (href) uniques.set(href, true);
    }
    return [...uniques.keys()];
  });
  console.log(`Journée ${journee} : ${infosMatchs.length} match(s) trouvé(s).`);
  for (const href of infosMatchs) {
    const idMatch = (href.match(/spielbericht\/(\d+)/) || [])[1];
    if (idMatch) matchsTm.push({ id: idMatch, url: `https://www.transfermarkt.fr${href}` });
  }
  await page.waitForTimeout(300);
}
console.log(`\n${matchsTm.length} match(s) trouvé(s) côté Transfermarkt (National 2 groupe ${GROUPE}, ${NB_JOURNEES} journée(s)).`);

// ---- 2. Pour chaque match : charge la page, vérifie que c'est bien terminé, extrait titre/date/score ----
const infosDetaillees = [];
for (const m of matchsTm) {
  try {
    await page.goto(m.url, { waitUntil: 'networkidle', timeout: 45000 });
  } catch (e) { console.log(`  Erreur chargement ${m.url} : ${e.message.split('\n')[0]}`); continue; }
  const titre = await page.title();
  // Titre réel observé (pas de score entre parenthèses, contrairement à
  // ce qui était supposé) : "Domicile - Extérieur, JJ mois[.] AAAA -
  // Championnat National 2 - Groupe X - Rapport de match | Transfermarkt"
  // — le mois peut être abrégé avec un point ("5 sept. 2026").
  const mTitre = titre.match(/^(.+?) - (.+?), (\d{1,2} [^\d\s.]+\.? \d{4}) -/);
  if (!mTitre) { console.log(`  Titre inattendu, match ignoré : "${titre}"`); continue; }
  infosDetaillees.push({ ...m, domicile: mTitre[1].trim(), exterieur: mTitre[2].trim(), dateTexte: mTitre[3] });
}

// ---- 3. Rapproche chaque match à une ligne calendrier_officiel existante ----
const { data: calendrier, error: errCal } = await supabase
  .from('calendrier_officiel')
  .select('id, equipe_domicile, equipe_exterieur, date_match')
  .eq('division', DIVISION).eq('groupe', GROUPE).eq('saison', SAISON);
if (errCal) { console.error('Erreur lecture calendrier_officiel :', errCal.message); await browser.close(); process.exit(1); }

// Transfermarkt abrège certains mois avec un point ("5 sept. 2026") et
// écrit les autres en toutes lettres ("29 août 2026") — couvre les deux
// formes (abrégée sans le point, et complète).
const MOIS_FR = {
  janv: 0, janvier: 0, févr: 1, fevr: 1, février: 1, fevrier: 1, mars: 2,
  avr: 3, avril: 3, mai: 4, juin: 5, juil: 6, juillet: 6, août: 7, aout: 7,
  sept: 8, septembre: 8, oct: 9, octobre: 9, nov: 10, novembre: 10,
  déc: 11, dec: 11, décembre: 11, decembre: 11,
};
function parseDateFr(texte) {
  const m = texte.match(/(\d{1,2}) ([^\d\s.]+)\.? (\d{4})/);
  if (!m) return null;
  const mois = MOIS_FR[m[2].toLowerCase().replace(/\.$/, '')];
  if (mois == null) return null;
  return new Date(Date.UTC(parseInt(m[3], 10), mois, parseInt(m[1], 10)));
}
const TOLERANCE_JOURS = 3;
function joursEcart(a, b) {
  return Math.abs((new Date(a).getTime() - new Date(b).getTime()) / 86400000);
}
const matchsARapprocher = [];
for (const m of infosDetaillees) {
  const dateTm = parseDateFr(m.dateTexte);
  if (!dateTm) continue;
  const dateTmStr = dateTm.toISOString().slice(0, 10);
  const candidates = (calendrier || []).filter((c) => joursEcart(c.date_match, dateTmStr) <= TOLERANCE_JOURS && clubsCorrespondent(c.equipe_domicile, m.domicile) && clubsCorrespondent(c.equipe_exterieur, m.exterieur));
  const ligne = candidates.sort((a, b) => joursEcart(a.date_match, dateTmStr) - joursEcart(b.date_match, dateTmStr))[0];
  if (ligne) matchsARapprocher.push({ ...m, dateTm: dateTmStr, calendrierOfficielId: ligne.id, equipeDomicileCal: ligne.equipe_domicile, equipeExterieurCal: ligne.equipe_exterieur });
}
console.log(`${matchsARapprocher.length}/${infosDetaillees.length} match(s) Transfermarkt rapproché(s) à une ligne calendrier_officiel existante.`);

// ---- 4. Ne garde que les matchs pas encore synchronisés ----
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

// ---- 5. Parseur page match : composition + .sb-aktion + timeline (minute approximative) ----
async function parserPageMatchTransfermarkt(pageMatch) {
  const compositions = await pageMatch.evaluate(() => {
    return [...document.querySelectorAll('table')].slice(0, 2).map((t) => {
      const lignes = [...t.querySelectorAll('tr')].map((tr) => [...tr.querySelectorAll('td,th')].map((td) => (td.textContent || '').trim()));
      const joueurs = [];
      for (const l of lignes) {
        if (l.length === 2 && l[1] && !['Officielle', 'Probable'].includes(l[1])) {
          for (const nom of l[1].split(',').map((s) => s.trim()).filter(Boolean)) joueurs.push(nom);
        }
      }
      return joueurs;
    });
  });

  const nomsEquipes = await pageMatch.evaluate(() => {
    return [...document.querySelectorAll('.sb-team, .sb-heim, .sb-gast')].map((el) => (el.textContent || '').trim()).filter(Boolean);
  });

  const evenements = await pageMatch.evaluate(() => {
    return [...document.querySelectorAll('.sb-aktion')].map((el) => {
      const uhr = el.querySelector('.sb-aktion-uhr .sb-sprite-uhr-klein');
      const club = el.querySelector('.sb-aktion-wappen a, .sb-aktion-wappen img');
      const spielstand = el.querySelector('.sb-aktion-spielstand span');
      const aktion = el.querySelector('.sb-aktion-aktion a');
      const wechselAus = el.querySelector('.sb-aktion-wechsel-aus a, .sb-aktion-spielerbild-aus img, [class*="wechsel-aus"] img');
      const wechselEin = el.querySelector('.sb-aktion-wechsel-ein a, .sb-aktion-spielerbild-ein img, [class*="wechsel-ein"] img');
      let type = 'inconnu';
      const classe = spielstand ? spielstand.className : '';
      if (classe.includes('sb-tor')) type = 'but';
      else if (classe.includes('sb-gelbrot')) type = 'rouge';
      else if (classe.includes('sb-gelb')) type = 'jaune';
      else if (classe.includes('sb-wechsel')) type = 'changement';
      const texteAction = el.textContent || '';
      const estDeuxiemeJaune = /2[eè]me carton jaune|second carton jaune|deuxi[eè]me carton jaune/i.test(texteAction);
      return {
        clubTitre: club ? (club.getAttribute('title') || club.textContent || '').trim() : null,
        type: estDeuxiemeJaune ? 'rouge' : type,
        joueur: aktion ? aktion.textContent.trim() : null,
        sortant: wechselAus ? (wechselAus.getAttribute('title') || wechselAus.textContent || '').trim() : null,
        entrant: wechselEin ? (wechselEin.getAttribute('title') || wechselEin.textContent || '').trim() : null,
      };
    });
  });

  const timeline = await pageMatch.evaluate(() => {
    const blocs = [];
    let equipeCourante = null;
    for (const el of document.querySelectorAll('.sb-zeitleiste-ereignisse > *')) {
      if (el.classList.contains('sb-leiste-heim')) equipeCourante = 'domicile';
      else if (el.classList.contains('sb-leiste-gast')) equipeCourante = 'exterieur';
      else if (el.classList.contains('sb-leiste-ereignis')) {
        const style = el.getAttribute('style') || '';
        const m = style.match(/left:\s*([\d.]+)%/);
        if (m) blocs.push({ equipe: equipeCourante, pourcentage: parseFloat(m[1]) });
      }
    }
    return blocs;
  });

  return { compositions, nomsEquipes, evenements, timeline };
}

// ---- 6. Calcule les stats par joueur à partir des événements + timeline ----
function calculerStatsMatch(donnees, clubDomicile, clubExterieur) {
  const [compoDomicile, compoExterieur] = donnees.compositions;
  const resultats = new Map(); // "club|nomAffiche" -> stats
  const cle = (club, nom) => `${club}|${nom}`;
  // Garde-fou : une entrée de composition qui correspond en fait à un nom
  // de club (ligne d'en-tête mal capturée dans le tableau, ex. "FC Metz B")
  // n'est pas un joueur — l'exclure évite un faux rapprochement plus tard.
  const estNomDeClub = (nom) => clubsCorrespondent(nom, clubDomicile) || clubsCorrespondent(nom, clubExterieur);
  for (const nom of compoDomicile || []) { if (estNomDeClub(nom)) continue; resultats.set(cle(clubDomicile, nom), { nomAffiche: nom, club: clubDomicile, titulaire: true, minutes: 90, buts: 0, cartonsJaunes: 0, cartonsRouges: 0 }); }
  for (const nom of compoExterieur || []) { if (estNomDeClub(nom)) continue; resultats.set(cle(clubExterieur, nom), { nomAffiche: nom, club: clubExterieur, titulaire: false, minutes: 90, buts: 0, cartonsJaunes: 0, cartonsRouges: 0 }); }
  // Corrige : la 2e table est l'équipe extérieure, donc titulaire doit être true pour elle aussi.
  for (const nom of compoExterieur || []) { const r = resultats.get(cle(clubExterieur, nom)); if (r) r.titulaire = true; }

  function clubReel(clubTitre) {
    if (!clubTitre) return null;
    if (clubsCorrespondent(clubTitre, clubDomicile)) return clubDomicile;
    if (clubsCorrespondent(clubTitre, clubExterieur)) return clubExterieur;
    return null;
  }
  function trouveOuCree(club, nomAffiche, titulaire) {
    const k = cle(club, nomAffiche);
    if (!resultats.has(k)) resultats.set(k, { nomAffiche, club, titulaire, minutes: titulaire ? 90 : 0, buts: 0, cartonsJaunes: 0, cartonsRouges: 0 });
    return resultats.get(k);
  }

  // Regroupe les événements + minutes approximatives (timeline) par équipe, dans l'ordre DOM.
  const evParEquipe = { domicile: [], exterieur: [] };
  for (const ev of donnees.evenements) {
    const club = clubReel(ev.clubTitre);
    if (!club) continue;
    const cote = club === clubDomicile ? 'domicile' : 'exterieur';
    evParEquipe[cote].push(ev);
  }
  const tlParEquipe = { domicile: [], exterieur: [] };
  for (const t of donnees.timeline) {
    if (t.equipe === 'domicile' || t.equipe === 'exterieur') tlParEquipe[t.equipe].push(t.pourcentage);
  }

  for (const cote of ['domicile', 'exterieur']) {
    const evs = evParEquipe[cote];
    const pcts = tlParEquipe[cote];
    for (let i = 0; i < evs.length; i++) {
      const ev = evs[i];
      const pct = pcts[i]; // corrélation par ordre — meilleure approximation disponible.
      const minute = pct != null ? Math.max(1, Math.min(90, Math.round((pct / 100) * 90))) : null;
      const club = cote === 'domicile' ? clubDomicile : clubExterieur;
      if (ev.type === 'but' && ev.joueur) {
        const r = trouveOuCree(club, ev.joueur, true);
        r.buts++;
      } else if (ev.type === 'jaune' && ev.joueur) {
        const r = trouveOuCree(club, ev.joueur, true);
        r.cartonsJaunes++;
      } else if (ev.type === 'rouge' && ev.joueur) {
        const r = trouveOuCree(club, ev.joueur, true);
        r.cartonsRouges++;
        if (minute != null) r.minutes = Math.min(r.minutes, minute);
      } else if (ev.type === 'changement') {
        if (ev.sortant) { const r = trouveOuCree(club, ev.sortant, true); if (minute != null) r.minutes = minute; }
        if (ev.entrant) { const r = trouveOuCree(club, ev.entrant, false); if (minute != null) r.minutes = Math.max(0, 90 - minute); }
      }
    }
  }
  return [...resultats.values()];
}

// ---- 7. Pour chaque match à synchroniser : parse, rapproche les joueurs, écrit ----
let totalMaj = 0, totalAmbigus = 0, totalNonTrouves = 0;
for (const m of matchsAsynchroniser) {
  console.log(`--- ${m.dateTm} — ${m.equipeDomicileCal} vs ${m.equipeExterieurCal} (calendrier_officiel_id=${m.calendrierOfficielId}) ---`);
  let donnees;
  try {
    await page.goto(m.url, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(500);
    donnees = await parserPageMatchTransfermarkt(page);
  } catch (e) { console.log(`  Erreur chargement page : ${e.message.split('\n')[0]}`); continue; }

  if (!donnees.compositions[0]?.length && !donnees.compositions[1]?.length) {
    console.log('  Compositions introuvables ou vides, match ignoré.');
    continue;
  }

  const resultatsParseur = calculerStatsMatch(donnees, m.equipeDomicileCal, m.equipeExterieurCal);

  const lignesMj = parCalendrierId.get(m.calendrierOfficielId) || [];
  const joueurIds = lignesMj.map((l) => l.joueur_id);
  const { data: joueurs, error: errJ } = await supabase.from('joueurs').select('id, prenom, nom, club').in('id', joueurIds);
  if (errJ) { console.log(`  Erreur lecture joueurs : ${errJ.message}`); continue; }

  for (const r of resultatsParseur) {
    const candidatsClub = joueurs.filter((j) => clubsCorrespondent(j.club, r.club));
    const correspondances = candidatsClub.filter((j) => nomFamilleCorrespond(r.nomAffiche, j.nom));
    if (correspondances.length === 0) { totalNonTrouves++; continue; }
    if (correspondances.length > 1) {
      console.log(`  Ambiguïté : "${r.nomAffiche}" correspond à ${correspondances.length} joueurs FootLight (${correspondances.map((j) => `${j.prenom} ${j.nom}`).join(', ')}), ignoré.`);
      totalAmbigus++;
      continue;
    }
    const joueur = correspondances[0];
    const ligneMj = lignesMj.find((l) => l.joueur_id === joueur.id);
    if (!ligneMj) continue;
    if (ligneMj.minutes_jouees != null) continue;
    if (!r.titulaire && r.minutes === 0) continue;

    console.log(`  ${DRY_RUN ? 'À écrire' : 'Écriture'} : ${joueur.prenom} ${joueur.nom} (TM: ${r.nomAffiche}) — minutes≈${r.minutes}, titulaire=${r.titulaire}, buts=${r.buts}, jaunes=${r.cartonsJaunes}, rouges=${r.cartonsRouges}`);
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

console.log(`\n========== Résumé (National 2 groupe ${GROUPE}, source Transfermarkt) ==========`);
console.log(`${matchsAsynchroniser.length} match(s) traité(s), ${totalMaj} mise(s) à jour ${DRY_RUN ? 'proposée(s)' : 'effectuée(s)'}, ${totalAmbigus} ambiguïté(s) ignorée(s), ${totalNonTrouves} joueur(s) Transfermarkt non retrouvé(s) côté FootLight.`);
console.log('Note : les minutes sont approximatives (arrondies depuis une position sur une timeline de 90 min), Transfermarkt n\'exposant jamais la minute exacte en texte brut.');
if (DRY_RUN) console.log('DRY_RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
