// Diagnostic lecture seule (aucune écriture) : après la première synchro
// stats FFF National 2 (884 mises à jour sur 8 groupes), ~20 clubs restent
// à matchs_joues=0.0. Hypothèse : leurs matchs FFF ne se rapprochent
// d'aucune ligne calendrier_officiel existante (nom de club différent
// entre FFF et calendrier_officiel — même classe de problème que celle
// rencontrée plusieurs fois sur National 1 cette session).
//
// Pour les 8 groupes N2, liste tous les matchs joués côté FFF et indique,
// pour chacun, s'il a pu être rapproché à une ligne calendrier_officiel
// (mêmes équipes via clubsCorrespondent + même date) — sans rien écrire.
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
const GROUPES = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8 };

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

const browser = await chromium.launch(process.env.PW_EXECUTABLE_PATH ? { executablePath: process.env.PW_EXECUTABLE_PATH } : {});
const page = await browser.newPage({ locale: 'fr-FR' });

const tousNonRapproches = [];
let totalFff = 0, totalRapproches = 0;

for (const [GROUPE, gpNo] of Object.entries(GROUPES)) {
  let jeton = null;
  page.removeAllListeners('request');
  page.on('request', (req) => {
    if (req.url().includes('/api/data/matches') && !jeton) jeton = req.headers()['x-competition'] || null;
  });
  await page.goto(`https://epreuves.fff.fr/competition/engagement/3-n2/phase/1/${gpNo}/resultats-et-calendrier`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(800);
  if (!jeton) { console.log(`Groupe ${GROUPE} : jeton introuvable, ignoré.`); continue; }

  async function appelerApi(dateDebut, dateFin) {
    const url = `https://epreuves.fff.fr/api/data/matches?cpNo=${CP_NO}&phNo=${PH_NO}&gpNo=${gpNo}&dateDebut=${encodeURIComponent(dateDebut.toISOString())}&dateFin=${encodeURIComponent(dateFin.toISOString())}&itemsPerPage=200&page=1&pagination=true`;
    return page.evaluate(async ({ u, xc }) => {
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
          matchsFff.push({ domicile: df.recevant.club.nom, exterieur: df.visiteur.club.nom, date: df.date.slice(0, 10) });
        }
      }
    }
    curseur = fin;
    await page.waitForTimeout(200);
  }

  const { data: calendrier } = await supabase
    .from('calendrier_officiel')
    .select('equipe_domicile, equipe_exterieur, date_match')
    .eq('division', DIVISION).eq('groupe', GROUPE).eq('saison', SAISON);

  const TOLERANCE_JOURS = 3;
  const joursEcart = (a, b) => Math.abs((new Date(a).getTime() - new Date(b).getTime()) / 86400000);
  let rapprochesGroupe = 0;
  for (const m of matchsFff) {
    const trouve = (calendrier || []).some((c) => joursEcart(c.date_match, m.date) <= TOLERANCE_JOURS && clubsCorrespondent(c.equipe_domicile, m.domicile) && clubsCorrespondent(c.equipe_exterieur, m.exterieur));
    if (trouve) rapprochesGroupe++;
    else tousNonRapproches.push({ groupe: GROUPE, ...m });
  }
  console.log(`Groupe ${GROUPE} : ${matchsFff.length} match(s) joué(s) FFF, ${rapprochesGroupe} rapproché(s), ${matchsFff.length - rapprochesGroupe} NON rapproché(s).`);
  totalFff += matchsFff.length;
  totalRapproches += rapprochesGroupe;
}
await browser.close();

console.log(`\n========== Total : ${totalFff} match(s) FFF, ${totalRapproches} rapproché(s), ${tousNonRapproches.length} NON rapproché(s) ==========\n`);
console.log('Détail des matchs NON rapprochés :');
for (const m of tousNonRapproches) {
  console.log(`  Groupe ${m.groupe} — ${m.date} — "${m.domicile}" vs "${m.exterieur}"`);
}
