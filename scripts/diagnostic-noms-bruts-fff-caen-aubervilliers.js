// Diagnostic lecture seule : les valeurs calendrier_officiel pour Caen
// (N2 groupe C) et Aubervilliers (N2 groupe E) ne suffisent pas à
// expliquer pourquoi ces clubs restent listés comme "manquants" — le
// calcul théorique de clubsCorrespondent(joueurs.club, calendrier)
// devrait déjà matcher pour Aubervilliers. Récupère les noms d'équipe
// BRUTS tels que renvoyés par l'API FFF elle-même (df.recevant/visiteur
// .club.nom), potentiellement une 3e orthographe différente des deux
// déjà vues côté calendrier_officiel.
import { chromium } from 'playwright';

const CP_NO = '452037';
const PH_NO = '1';
const CIBLES = [
  { groupe: 'C', gpNo: 3, mot: 'caen' },
  { groupe: 'E', gpNo: 5, mot: 'aubervilliers' },
];

const browser = await chromium.launch(process.env.PW_EXECUTABLE_PATH ? { executablePath: process.env.PW_EXECUTABLE_PATH } : {});
const page = await browser.newPage({ locale: 'fr-FR' });

for (const { groupe, gpNo, mot } of CIBLES) {
  let jeton = null;
  page.removeAllListeners('request');
  page.on('request', (req) => {
    if (req.url().includes('/api/data/matches') && !jeton) jeton = req.headers()['x-competition'] || null;
  });
  await page.goto(`https://epreuves.fff.fr/competition/engagement/3-n2/phase/1/${gpNo}/resultats-et-calendrier`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(800);
  if (!jeton) { console.log(`Groupe ${groupe} : jeton introuvable.`); continue; }

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
  const noms = new Set();
  const matchsCibles = [];
  let curseur = new Date(DEBUT_SAISON);
  while (curseur < AUJOURD_HUI) {
    const fin = new Date(Math.min(curseur.getTime() + 14 * 86400000, AUJOURD_HUI.getTime()));
    const resultat = await appelerApi(curseur, fin);
    if (resultat.statut === 200) {
      for (const m of resultat.membres) {
        const df = m.donneesFormatees;
        const dom = df?.recevant?.club?.nom, ext = df?.visiteur?.club?.nom;
        if (dom && new RegExp(mot, 'i').test(dom)) { noms.add(dom); matchsCibles.push({ id: m.id, dom, ext, date: df.date, joue: df.joue }); }
        if (ext && new RegExp(mot, 'i').test(ext)) { noms.add(ext); matchsCibles.push({ id: m.id, dom, ext, date: df.date, joue: df.joue }); }
      }
    }
    curseur = fin;
    await page.waitForTimeout(200);
  }
  console.log(`\n########## Groupe ${groupe} — "${mot}" côté API FFF ##########`);
  console.log(`Noms bruts distincts : ${[...noms].map((n) => `"${n}"`).join(', ')}`);
  console.log(`Matchs concernés (${matchsCibles.length}) :`);
  matchsCibles.forEach((m) => console.log(`  id=${m.id} — ${m.date?.slice(0, 10)} — joue=${m.joue} — "${m.dom}" vs "${m.ext}"`));
}
await browser.close();
