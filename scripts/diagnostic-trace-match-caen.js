// Diagnostic lecture seule : trace précisément le match Cesson OC vs AS
// PTT Caen (id FFF 55748703, National 2 groupe C) pour comprendre
// pourquoi ses 16 joueurs restent signalés "manquants" alors que le
// calcul théorique de clubsCorrespondent dit que ça devrait matcher
// (AS PTT Caen / As Ptt Caen 1 / AS PTT CAEN se réduisent tous à
// ['ptt','caen']). Affiche la valeur EXACTE de c.club retenue par le
// parseur pour chaque joueur de la composition, et le résultat du
// rapprochement club contre le vrai club FootLight.
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

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

const TOLERANCE_JOURS = 3;
const joursEcart = (a, b) => Math.abs((new Date(a).getTime() - new Date(b).getTime()) / 86400000);

function parserPageMatch(texteBrut, clubDomicile, clubExterieur) {
  const lignes = texteBrut.split('\n').map((l) => l.trim()).filter(Boolean);
  const idxResume = lignes.indexOf('RÉSUMÉ');
  const idxComposition = lignes.indexOf('COMPOSITION', idxResume === -1 ? 0 : idxResume);
  if (idxResume === -1 || idxComposition === -1) return null;
  const compoLignes = lignes.slice(idxComposition + 1);
  const composition = [];
  let clubCourant = null, sousListe = null;
  const reNumero = /^\d+$/;
  const headersVus = [];
  for (let j = 0; j < compoLignes.length; j++) {
    const l = compoLignes[j];
    if (l === 'LIEU DE LA RENCONTRE') break;
    if (l === clubDomicile || l === clubExterieur) { clubCourant = l; sousListe = null; headersVus.push({ ligne: l, correspondPasse: true }); continue; }
    if (l === 'TITULAIRES') { sousListe = 'titulaires'; continue; }
    if (l === 'REMPLAÇANTS') { sousListe = 'remplacants'; continue; }
    if (reNumero.test(l) && sousListe && clubCourant) {
      const nom = compoLignes[j + 1];
      if (nom) { composition.push({ nomAffiche: nom, club: clubCourant }); j++; }
    }
  }
  return { composition: composition.length ? composition : null, headersVus };
}

const MATCH_ID = 55748703;
const GROUPE = 'C';
const DIVISION = 'N2';
const SAISON = '2026-2027';

const browser = await chromium.launch(process.env.PW_EXECUTABLE_PATH ? { executablePath: process.env.PW_EXECUTABLE_PATH } : {});
const page = await browser.newPage({ locale: 'fr-FR' });
const url = `https://epreuves.fff.fr/competition/match/${MATCH_ID}/match`;
await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
await page.waitForTimeout(1200);
const texte = await page.evaluate(() => document.body.innerText);
await browser.close();

// Affiche les lignes brutes de la section COMPOSITION pour voir les en-têtes réels.
const lignes = texte.split('\n').map((l) => l.trim()).filter(Boolean);
const idxComposition = lignes.indexOf('COMPOSITION');
console.log('--- 40 premières lignes après COMPOSITION (en-têtes réels de la page) ---');
lignes.slice(idxComposition + 1, idxComposition + 41).forEach((l, i) => console.log(`  [${i}] "${l}"`));

const { data: calendrier } = await supabase
  .from('calendrier_officiel')
  .select('id, equipe_domicile, equipe_exterieur, date_match')
  .eq('division', DIVISION).eq('groupe', GROUPE).eq('saison', SAISON)
  .or('equipe_domicile.ilike.%caen%,equipe_exterieur.ilike.%caen%,equipe_domicile.ilike.%cesson%,equipe_exterieur.ilike.%cesson%');
console.log('\n--- Lignes calendrier_officiel candidates (Caen/Cesson) ---');
(calendrier || []).forEach((c) => console.log(`  id=${c.id} — ${c.date_match} — "${c.equipe_domicile}" vs "${c.equipe_exterieur}"`));

const domicileFff = 'CESSON OC', exterieurFff = 'AS PTT CAEN', dateFff = '2026-08-29';
const candidats = (calendrier || []).filter((c) => joursEcart(c.date_match, dateFff) <= TOLERANCE_JOURS && clubsCorrespondent(c.equipe_domicile, domicileFff) && clubsCorrespondent(c.equipe_exterieur, exterieurFff));
console.log(`\n--- Rapprochement (tolérance ${TOLERANCE_JOURS}j) pour "${domicileFff}" vs "${exterieurFff}" le ${dateFff} ---`);
candidats.forEach((c) => console.log(`  candidat : id=${c.id} — ${c.date_match} — "${c.equipe_domicile}" vs "${c.equipe_exterieur}"`));
const ligneChoisie = candidats.sort((a, b) => joursEcart(a.date_match, dateFff) - joursEcart(b.date_match, dateFff))[0];
console.log(`Ligne choisie : ${ligneChoisie ? `id=${ligneChoisie.id} — "${ligneChoisie.equipe_domicile}" vs "${ligneChoisie.equipe_exterieur}"` : 'AUCUNE'}`);

if (ligneChoisie) {
  console.log('\n--- Tentative 1 : parserPageMatch avec les noms calendrier ---');
  const r1 = parserPageMatch(texte, ligneChoisie.equipe_domicile, ligneChoisie.equipe_exterieur);
  console.log(`  clubDomicile="${ligneChoisie.equipe_domicile}", clubExterieur="${ligneChoisie.equipe_exterieur}"`);
  console.log(`  composition trouvée : ${r1.composition ? r1.composition.length + ' entrée(s)' : 'NULL (aucune)'}`);
  if (r1.composition) {
    const clubsDistincts = new Set(r1.composition.map((c) => c.club));
    console.log(`  clubs distincts dans la composition : ${[...clubsDistincts].map((c) => `"${c}"`).join(', ')}`);
  }
}

console.log('\n--- Tentative 2 (repli) : parserPageMatch avec les noms bruts FFF ---');
const r2 = parserPageMatch(texte, domicileFff, exterieurFff);
console.log(`  clubDomicile="${domicileFff}", clubExterieur="${exterieurFff}"`);
console.log(`  composition trouvée : ${r2.composition ? r2.composition.length + ' entrée(s)' : 'NULL (aucune)'}`);
if (r2.composition) {
  const clubsDistincts = new Set(r2.composition.map((c) => c.club));
  console.log(`  clubs distincts dans la composition : ${[...clubsDistincts].map((c) => `"${c}"`).join(', ')}`);
  const caenEntries = r2.composition.filter((c) => clubsCorrespondent(c.club, 'AS PTT Caen'));
  console.log(`  entrées rapprochables à "AS PTT Caen" (FootLight) : ${caenEntries.length}`);
}
