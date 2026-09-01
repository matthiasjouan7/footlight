// Diagnostic lecture seule (aucune écriture) : sync-fff-match-stats-n2.js
// ne loggue qu'un compteur de joueurs FFF non retrouvés côté FootLight,
// jamais leurs noms. Ce script liste nommément, pour les 8 groupes N2 et
// tous les matchs déjà rapprochés à une ligne calendrier_officiel, les
// joueurs présents dans la composition FFF (titulaires + remplaçants)
// mais absents de l'effectif FootLight du club correspondant — pour
// identifier les fiches à créer.
//
// Réutilise exactement la même logique de rapprochement club/joueur que
// sync-fff-match-stats-n2.js (tolérance de date ±3 jours, canonicalisation
// des suffixes réserve b<->2, rapprochement par nom de famille).
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const DIVISION = 'N2';
const SAISON = '2026-2027';
const CP_NO = '452037';
const PH_NO = '1';
const GROUPES_LETTRE_VERS_GPNO = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8 };

function normaliserClub(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
const MOTS_GENERIQUES_CLUB = new Set(['fc', 'ofc', 'afc', 'asc', 'ac', 'sc', 'csc', 'cs', 'us', 'uso', 'as', 'sm', 'sa', 'vf', 'football', 'club', 'sporting', 'racing', 'stade', 'olympique', 'ol', 'd', '1', 'sur', 'sous', 'en', 'la', 'le', 'les', 'de', 'du', 'des']);
function motsClub(s) {
  const mots = normaliserClub(s).split(' ').filter(Boolean).filter((w) => !MOTS_GENERIQUES_CLUB.has(w));
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

function parserPageMatch(texteBrut, clubDomicile, clubExterieur) {
  const lignes = texteBrut.split('\n').map((l) => l.trim()).filter(Boolean);
  const idxResume = lignes.indexOf('RÉSUMÉ');
  const idxComposition = lignes.indexOf('COMPOSITION', idxResume === -1 ? 0 : idxResume);
  if (idxResume === -1 || idxComposition === -1) return null;
  const compoLignes = lignes.slice(idxComposition + 1);
  const composition = [];
  let clubCourant = null, sousListe = null;
  const reNumero = /^\d+$/;
  for (let j = 0; j < compoLignes.length; j++) {
    const l = compoLignes[j];
    if (l === 'LIEU DE LA RENCONTRE') break;
    if (l === clubDomicile || l === clubExterieur) { clubCourant = l; sousListe = null; continue; }
    if (l === 'TITULAIRES') { sousListe = 'titulaires'; continue; }
    if (l === 'REMPLAÇANTS') { sousListe = 'remplacants'; continue; }
    if (reNumero.test(l) && sousListe && clubCourant) {
      const nom = compoLignes[j + 1];
      if (nom) { composition.push({ nomAffiche: nom, club: clubCourant }); j++; }
    }
  }
  return composition.length ? composition : null;
}

const TOLERANCE_JOURS = 3;
function joursEcart(a, b) { return Math.abs((new Date(a).getTime() - new Date(b).getTime()) / 86400000); }

const browser = await chromium.launch(process.env.PW_EXECUTABLE_PATH ? { executablePath: process.env.PW_EXECUTABLE_PATH } : {});
const pageJeton = await browser.newPage({ locale: 'fr-FR' });
const pageMatch = await browser.newPage({ locale: 'fr-FR' });

const manquantsParClub = new Map(); // club -> Set(nomAffiche)

for (const [GROUPE, gpNo] of Object.entries(GROUPES_LETTRE_VERS_GPNO)) {
  let jeton = null;
  pageJeton.removeAllListeners('request');
  pageJeton.on('request', (req) => {
    if (req.url().includes('/api/data/matches') && !jeton) jeton = req.headers()['x-competition'] || null;
  });
  try {
    await pageJeton.goto(`https://epreuves.fff.fr/competition/engagement/3-n2/phase/1/${gpNo}/resultats-et-calendrier`, { waitUntil: 'networkidle', timeout: 60000 });
    await pageJeton.waitForTimeout(800);
  } catch (e) { console.log(`Groupe ${GROUPE} : erreur navigation (${e.message.split('\n')[0]}), ignoré.`); continue; }
  if (!jeton) { console.log(`Groupe ${GROUPE} : jeton introuvable, ignoré.`); continue; }

  async function appelerApi(dateDebut, dateFin) {
    const url = `https://epreuves.fff.fr/api/data/matches?cpNo=${CP_NO}&phNo=${PH_NO}&gpNo=${gpNo}&dateDebut=${encodeURIComponent(dateDebut.toISOString())}&dateFin=${encodeURIComponent(dateFin.toISOString())}&itemsPerPage=200&page=1&pagination=true`;
    return pageJeton.evaluate(async ({ u, xc }) => {
      try {
        const r = await fetch(u, { headers: { Accept: 'application/json, text/plain, */*', 'x-competition': xc } });
        const texte = await r.text();
        if (r.status !== 200) return { statut: r.status };
        return { statut: 200, membres: JSON.parse(texte)['hydra:member'] || [] };
      } catch (err) { return { statut: 0 }; }
    }, { u: url, xc: jeton });
  }

  const DEBUT_SAISON = new Date('2026-07-01T00:00:00Z');
  const AUJOURD_HUI = new Date();
  const matchsFff = [];
  let curseur = new Date(DEBUT_SAISON);
  while (curseur < AUJOURD_HUI) {
    const fin = new Date(Math.min(curseur.getTime() + 14 * 86400000, AUJOURD_HUI.getTime()));
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
    await pageJeton.waitForTimeout(200);
  }

  const { data: calendrier } = await supabase
    .from('calendrier_officiel')
    .select('equipe_domicile, equipe_exterieur, date_match')
    .eq('division', DIVISION).eq('groupe', GROUPE).eq('saison', SAISON);

  const matchsARapprocher = [];
  for (const m of matchsFff) {
    const candidates = (calendrier || []).filter((c) => joursEcart(c.date_match, m.date) <= TOLERANCE_JOURS && clubsCorrespondent(c.equipe_domicile, m.domicile) && clubsCorrespondent(c.equipe_exterieur, m.exterieur));
    const ligne = candidates.sort((a, b) => joursEcart(a.date_match, m.date) - joursEcart(b.date_match, m.date))[0];
    if (ligne) matchsARapprocher.push({ ...m, equipeDomicileCal: ligne.equipe_domicile, equipeExterieurCal: ligne.equipe_exterieur });
  }

  const { data: joueursGroupe } = await supabase
    .from('joueurs')
    .select('prenom, nom, club')
    .eq('niveau', DIVISION).eq('saison', SAISON);

  let manquantsGroupe = 0;
  for (const m of matchsARapprocher) {
    const url = `https://epreuves.fff.fr/competition/match/${m.id}/match`;
    let texte;
    try {
      await pageMatch.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
      await pageMatch.waitForTimeout(1200);
      texte = await pageMatch.evaluate(() => document.body.innerText);
    } catch (e) { continue; }
    const composition = parserPageMatch(texte, m.equipeDomicileCal, m.equipeExterieurCal) || parserPageMatch(texte, m.domicile, m.exterieur);
    if (!composition) continue;

    for (const c of composition) {
      const candidatsClub = (joueursGroupe || []).filter((j) => clubsCorrespondent(j.club, c.club));
      const trouve = candidatsClub.some((j) => nomFamilleCorrespond(c.nomAffiche, j.nom));
      if (!trouve) {
        const clubClef = m.equipeDomicileCal === c.club || clubsCorrespondent(m.equipeDomicileCal, c.club) ? m.equipeDomicileCal : (m.equipeExterieurCal === c.club || clubsCorrespondent(m.equipeExterieurCal, c.club) ? m.equipeExterieurCal : c.club);
        if (!manquantsParClub.has(clubClef)) manquantsParClub.set(clubClef, new Set());
        manquantsParClub.get(clubClef).add(c.nomAffiche);
        manquantsGroupe++;
      }
    }
  }
  console.log(`Groupe ${GROUPE} : ${matchsARapprocher.length} match(s) analysé(s), ${manquantsGroupe} apparition(s) de joueur(s) manquant(s).`);
}
await browser.close();

const totalNoms = [...manquantsParClub.values()].reduce((acc, s) => acc + s.size, 0);
console.log(`\n========== ${totalNoms} joueur(s) distinct(s) manquant(s) sur FootLight (${manquantsParClub.size} club(s)) ==========\n`);
const clubsTries = [...manquantsParClub.entries()].sort((a, b) => a[0].localeCompare(b[0]));
for (const [club, noms] of clubsTries) {
  console.log(`${club} (${noms.size}) :`);
  [...noms].sort().forEach((n) => console.log(`  - ${n}`));
}
