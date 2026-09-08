// Diagnostic lecture seule : sync-transfermarkt-match-stats-n2.js (DRY_RUN,
// National 2 groupe C) ne propose AUCUNE écriture pour les matchs de
// "Fc St Lo Manche 1" (ex: id=845 St-Pierre de Milizac vs Fc St Lo Manche 1,
// id=869 Fc St Lo Manche 1 vs Stade Rennais FC B) alors que d'autres matchs
// du même groupe fonctionnent. Objectif : comparer les noms bruts affichés
// par Transfermarkt dans la composition à ceux stockés côté FootLight pour
// ce club, afin de comprendre pourquoi nomFamilleCorrespond() ne matche
// jamais aucun joueur de ce club précis.
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const SAISON = '2026-2027';
const CALENDRIER_OFFICIEL_ID = parseInt(process.env.CALENDRIER_OFFICIEL_ID || '845', 10);
const WETTBEWERB = 'FR5C';
const SAISON_ID_TM = '2026';
const NB_JOURNEES = parseInt(process.env.NB_JOURNEES || '6', 10);

console.log(`=== Diagnostic noms Transfermarkt vs FootLight pour calendrier_officiel_id=${CALENDRIER_OFFICIEL_ID} ===\n`);

// ---- Côté FootLight : la ligne calendrier + les joueurs déjà rattachés ----
const { data: ligneCal, error: errCal } = await supabase
  .from('calendrier_officiel')
  .select('id, equipe_domicile, equipe_exterieur, date_match')
  .eq('id', CALENDRIER_OFFICIEL_ID).single();
if (errCal) { console.error('Erreur lecture calendrier_officiel :', errCal.message); process.exit(1); }
console.log(`Ligne calendrier : "${ligneCal.equipe_domicile}" vs "${ligneCal.equipe_exterieur}" (${ligneCal.date_match})\n`);

const { data: mj, error: errMj } = await supabase
  .from('matchs_joueur')
  .select('id, joueur_id, minutes_jouees')
  .eq('calendrier_officiel_id', CALENDRIER_OFFICIEL_ID);
if (errMj) { console.error('Erreur lecture matchs_joueur :', errMj.message); process.exit(1); }
const joueurIds = mj.map((l) => l.joueur_id);
const { data: joueurs, error: errJ } = await supabase.from('joueurs').select('id, prenom, nom, club').in('id', joueurIds);
if (errJ) { console.error('Erreur lecture joueurs :', errJ.message); process.exit(1); }
console.log(`${joueurs.length} joueur(s) FootLight déjà rattaché(s) à ce match (via matchs_joueur) :`);
for (const j of joueurs) console.log(`  id=${j.id} "${j.prenom} ${j.nom}" club="${j.club}"`);

// ---- Côté Transfermarkt : retrouve l'URL du match puis extrait les compositions brutes ----
const browser = await chromium.launch();
const page = await browser.newPage({ locale: 'fr-FR', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36' });

function normaliserMot(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
const MOTS_GENERIQUES = new Set(['fc', 'as', 'sm', 'ta', 'ea', 'oc', 'af', '1', '2', 'de', 'du', 'des', 'la', 'le', 'les', 'saint', 'st']);
function motSignificatif(nomClub) {
  const mots = normaliserMot(nomClub).split(' ').filter((w) => w.length > 2 && !MOTS_GENERIQUES.has(w));
  return mots[0] || normaliserMot(nomClub).split(' ')[0];
}
const motDomicile = motSignificatif(ligneCal.equipe_domicile);
const motExterieur = motSignificatif(ligneCal.equipe_exterieur);
console.log(`Mots recherchés dans le titre Transfermarkt : "${motDomicile}" + "${motExterieur}"`);

let urlMatch = null;
for (let journee = 1; journee <= NB_JOURNEES && !urlMatch; journee++) {
  const urlJournee = `https://www.transfermarkt.fr/national-2/spieltag/wettbewerb/${WETTBEWERB}/saison_id/${SAISON_ID_TM}/spieltag/${journee}`;
  await page.goto(urlJournee, { waitUntil: 'networkidle', timeout: 45000 });
  const liens = await page.evaluate(() => [...document.querySelectorAll('a[href*="/spielbericht/index/spielbericht/"]')].map((a) => a.getAttribute('href')));
  for (const href of [...new Set(liens)]) {
    const idMatch = (href.match(/spielbericht\/(\d+)/) || [])[1];
    if (!idMatch) continue;
    const urlCandidate = `https://www.transfermarkt.fr${href}`;
    await page.goto(urlCandidate, { waitUntil: 'networkidle', timeout: 45000 });
    const titre = normaliserMot(await page.title());
    if (titre.includes(motDomicile) && titre.includes(motExterieur)) { urlMatch = urlCandidate; console.log(`\nTitre Transfermarkt trouvé (journée ${journee}) : "${await page.title()}"`); break; }
  }
}

if (!urlMatch) { console.log('\nMatch introuvable côté Transfermarkt dans les journées scannées.'); await browser.close(); process.exit(0); }

await page.goto(urlMatch, { waitUntil: 'networkidle', timeout: 45000 });
await page.waitForTimeout(500);
// Diagnostique TOUTES les <table> de la page (pas seulement les 2 premières
// comme le script de production) pour vérifier si la composition d'une
// des deux équipes se trouve au-delà de l'index 1 (ex: une table non liée
// aux compositions serait insérée avant, décalant tout).
const toutesLesTables = await page.evaluate(() => {
  return [...document.querySelectorAll('table')].map((t, i) => {
    const lignes = [...t.querySelectorAll('tr')].map((tr) => [...tr.querySelectorAll('td,th')].map((td) => (td.textContent || '').trim()));
    const joueursTxt = [];
    for (const l of lignes) {
      if (l.length === 2 && l[1] && !['Officielle', 'Probable'].includes(l[1])) {
        for (const nom of l[1].split(',').map((s) => s.trim()).filter(Boolean)) joueursTxt.push(nom);
      }
    }
    return { index: i, classe: t.className || null, nbLignes: lignes.length, joueurs: joueursTxt };
  });
});
console.log(`\nURL du match : ${urlMatch}`);
console.log(`\n${toutesLesTables.length} <table> trouvée(s) au total sur la page :`);
for (const t of toutesLesTables) {
  console.log(`  table[${t.index}] class="${t.classe}" — ${t.nbLignes} ligne(s) — ${t.joueurs.length} nom(s) extrait(s)${t.joueurs.length ? ' : ' + t.joueurs.map((n) => `"${n}"`).join(', ') : ''}`);
}

// Diagnostique pourquoi buts/cartons ressortent systématiquement à 0 : vérifie
// si la page expose bien un fil d'événements (.sb-aktion) et une timeline
// (.sb-zeitleiste-ereignisse), ou si cette compétition/ce niveau ne publie
// tout simplement pas ce détail sur Transfermarkt (contrairement aux
// compositions, qui elles sont bien présentes).
const diagnosticEvenements = await page.evaluate(() => {
  const aktions = [...document.querySelectorAll('.sb-aktion')].map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim());
  const timelineBlocs = document.querySelectorAll('.sb-zeitleiste-ereignisse > *').length;
  const scoreEl = document.querySelector('.sb-endstand, .sb-spielstand, [class*="ergebnis"], [class*="resultat"]');
  return {
    nbAktions: aktions.length,
    exemplesAktions: aktions.slice(0, 5),
    nbTimelineBlocs: timelineBlocs,
    scoreTexte: scoreEl ? (scoreEl.textContent || '').trim() : null,
    titrePage: document.title,
  };
});
console.log(`\n=== Diagnostic événements (buts/cartons/remplacements) ===`);
console.log(`Score affiché sur la page : "${diagnosticEvenements.scoreTexte}"`);
console.log(`${diagnosticEvenements.nbAktions} élément(s) .sb-aktion trouvé(s) (buts/cartons/remplacements).`);
if (diagnosticEvenements.nbAktions) {
  console.log('Exemples :');
  for (const a of diagnosticEvenements.exemplesAktions) console.log(`  "${a}"`);
}
console.log(`${diagnosticEvenements.nbTimelineBlocs} bloc(s) trouvé(s) dans .sb-zeitleiste-ereignisse.`);

await browser.close();
