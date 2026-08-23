// Remplace intégralement calendrier_officiel pour National 1 / groupe C /
// saison 2026-2027 par les données officielles FFF (epreuves.fff.fr),
// suite au repêchage d'Union Foot de Touraine (poule passée à 17 équipes).
//
// Les données actuelles en base sont obsolètes : encore calées sur l'ancienne
// poule à 16 équipes (30 journées, pas de Touraine), avec des doublons de
// noms de club sous deux graphies différentes (ex: "ISTRES FC" / "Istres",
// "NIMES OL" / "Nîmes") et une journée 1 comptant 20 lignes au lieu de ~8.
// Confirmé par check-touraine-calendrier.js. Remplacement complet choisi
// par l'utilisateur plutôt qu'une fusion, vu l'état des doublons existants.
//
// Découvertes des diagnostics précédents (API JSON epreuves.fff.fr) :
// - cpNo=452036, phNo=1, gpNo=3 identifient National 1 / phase 1 / groupe C.
// - L'API exige un en-tête "x-competition" (jeton capturé depuis une vraie
//   requête Angular) ET un fetch() exécuté dans le moteur réseau de
//   Chromium (page.evaluate) — sinon 403, même avec le bon en-tête depuis
//   Node ou page.request.get(). Voir diagnostic-fff-api-suite2.js /
//   diagnostic-fff-api-headers.js / diagnostic-fff-api-combo.js.
// - Une plage de dates couvrant toute la saison renvoie 503 (page de
//   maintenance FFF) — il faut paginer par tranches de 14 jours.
// - Champs match utiles : donneesFormatees.date, .recevant.club.nom,
//   .visiteur.club.nom, .recevant.buts, .visiteur.buts, .joue. Le numéro de
//   journée n'est pas sur le match lui-même : dérivé de la liste des
//   journées (date + pjNo) intégrée dans les métadonnées de compétition
//   partagées, en cherchant le groupe "POULE C" (gpNo=3).
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const DRY_RUN = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const DIVISION = 'N1';
const GROUPE = 'C';
const SAISON = '2026-2027';

const URL_PAGE = 'https://epreuves.fff.fr/competition/engagement/2-n1/phase/1/3/resultats-et-calendrier';
const BASE_API = 'https://epreuves.fff.fr/api/data/matches?cpNo=452036&phNo=1&gpNo=3';
const DEBUT_SAISON = new Date('2026-07-01T00:00:00Z');
const FIN_SAISON = new Date('2027-06-30T00:00:00Z');
const JOURS_PAR_TRANCHE = 14;

console.log(`Mode : ${DRY_RUN ? 'DRY_RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}\n`);

const browser = await chromium.launch(process.env.PW_EXECUTABLE_PATH ? { executablePath: process.env.PW_EXECUTABLE_PATH } : {});
const page = await browser.newPage();

let jeton = null;
page.on('request', (req) => {
  if (req.url().includes('/api/data/matches') && !jeton) {
    jeton = req.headers()['x-competition'] || null;
  }
});
await page.goto(URL_PAGE, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1000);
if (!jeton) { console.error('Jeton x-competition introuvable, abandon.'); await browser.close(); process.exit(1); }
console.log(`Jeton x-competition capturé : ${jeton}`);

async function appelerApi(dateDebut, dateFin) {
  const url = `${BASE_API}&dateDebut=${encodeURIComponent(dateDebut.toISOString())}&dateFin=${encodeURIComponent(dateFin.toISOString())}&itemsPerPage=200&page=1&pagination=true`;
  return page.evaluate(async ({ u, xc }) => {
    try {
      const r = await fetch(u, { headers: { Accept: 'application/json, text/plain, */*', 'x-competition': xc } });
      const texte = await r.text();
      if (r.status !== 200) return { statut: r.status, erreur: texte.slice(0, 200) };
      return { statut: 200, membres: JSON.parse(texte)['hydra:member'] || [] };
    } catch (err) {
      return { statut: 0, erreur: String(err) };
    }
  }, { u: url, xc: jeton });
}

const matchsParId = new Map();
let journeesGroupeC = null;
let curseur = new Date(DEBUT_SAISON);
let tranchesEchouees = 0;

while (curseur < FIN_SAISON) {
  const fin = new Date(Math.min(curseur.getTime() + JOURS_PAR_TRANCHE * 86400000, FIN_SAISON.getTime()));
  const resultat = await appelerApi(curseur, fin);
  if (resultat.statut === 200) {
    for (const m of resultat.membres) {
      if (m.id) matchsParId.set(m.id, m);
      if (!journeesGroupeC) {
        const groupes = m?.donneesFormatees?.competition?.donneesFormatees?.phases?.[0]?.groupes || [];
        const groupeC = groupes.find((g) => g.gpNo === '3' || /poule\s*c/i.test(g.nom || ''));
        if (groupeC?.journees?.length) {
          journeesGroupeC = groupeC.journees
            .map((j) => ({ pjNo: parseInt(j.pjNo, 10), date: j.date }))
            .sort((a, b) => a.date.localeCompare(b.date));
        }
      }
    }
  } else {
    tranchesEchouees++;
    console.log(`Tranche ${curseur.toISOString().slice(0, 10)} -> ${fin.toISOString().slice(0, 10)} : ÉCHEC statut=${resultat.statut}`);
  }
  curseur = fin;
  await page.waitForTimeout(300);
}
await browser.close();

console.log(`\nMatchs FFF récupérés : ${matchsParId.size} (tranches en échec : ${tranchesEchouees})`);
if (!journeesGroupeC) { console.error('Liste des journées groupe C introuvable, abandon.'); process.exit(1); }
console.log(`Journées groupe C connues : ${journeesGroupeC.length} (de J${journeesGroupeC[0].pjNo} à J${journeesGroupeC.at(-1).pjNo})`);

function journeePour(dateMatchIso) {
  let trouve = journeesGroupeC[0].pjNo;
  for (const j of journeesGroupeC) {
    if (j.date <= dateMatchIso) trouve = j.pjNo;
    else break;
  }
  return trouve;
}

const lignes = [];
for (const m of matchsParId.values()) {
  const df = m.donneesFormatees;
  const domicile = df?.recevant?.club?.nom;
  const exterieur = df?.visiteur?.club?.nom;
  const dateIso = df?.date;
  if (!domicile || !exterieur || !dateIso) continue;
  lignes.push({
    equipe_domicile: domicile,
    equipe_exterieur: exterieur,
    date_match: dateIso.slice(0, 10),
    division: DIVISION,
    groupe: GROUPE,
    saison: SAISON,
    journee: journeePour(dateIso),
  });
}
console.log(`Lignes prêtes à insérer : ${lignes.length}`);

const equipes = new Set();
for (const l of lignes) { equipes.add(l.equipe_domicile); equipes.add(l.equipe_exterieur); }
console.log(`Équipes distinctes (${equipes.size}) :`);
console.log([...equipes].sort().join(', '));
console.log(`\nTouraine présent : ${[...equipes].some((e) => /touraine/i.test(e))}`);

const parJournee = {};
for (const l of lignes) parJournee[l.journee] = (parJournee[l.journee] || 0) + 1;
console.log(`\nMatchs par journée : ${JSON.stringify(parJournee)}`);

const { data: existantes, error: erreurLecture } = await supabase
  .from('calendrier_officiel')
  .select('id')
  .eq('division', DIVISION)
  .eq('groupe', GROUPE)
  .eq('saison', SAISON);
if (erreurLecture) { console.error('Erreur lecture existant :', erreurLecture.message); process.exit(1); }
console.log(`\nLignes existantes à supprimer (division=${DIVISION}, groupe=${GROUPE}, saison=${SAISON}) : ${existantes?.length || 0}`);

console.log('\n5 premières lignes à insérer (aperçu) :');
for (const l of lignes.slice(0, 5)) {
  console.log(`  ${l.date_match} — J${l.journee} — ${l.equipe_domicile} vs ${l.equipe_exterieur}`);
}

if (DRY_RUN) {
  console.log('\nDRY_RUN : aucune suppression ni insertion effectuée.');
  process.exit(0);
}

console.log('\n=== Écriture réelle ===');
const { error: erreurSuppression } = await supabase
  .from('calendrier_officiel')
  .delete()
  .eq('division', DIVISION)
  .eq('groupe', GROUPE)
  .eq('saison', SAISON);
if (erreurSuppression) { console.error('Erreur suppression :', erreurSuppression.message); process.exit(1); }
console.log(`Supprimé : ${existantes?.length || 0} ligne(s) existante(s).`);

const TAILLE_LOT = 100;
let inseres = 0;
for (let i = 0; i < lignes.length; i += TAILLE_LOT) {
  const lot = lignes.slice(i, i + TAILLE_LOT);
  const { error: erreurInsertion } = await supabase.from('calendrier_officiel').insert(lot);
  if (erreurInsertion) { console.error(`Erreur insertion lot ${i} :`, erreurInsertion.message); process.exit(1); }
  inseres += lot.length;
}
console.log(`Inséré : ${inseres} ligne(s).`);
