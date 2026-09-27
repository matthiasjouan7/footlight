// Diagnostic lecture seule, par capture d'écran, généralisé à TOUTES les
// sources externes utilisées par les synchros, sur TOUS les groupes (au
// lieu d'un diagnostic ponctuel par cas signalé) :
//   - lequipe.fr (calendrier + stats) : seule source pour N1/Ligue 3,
//     secours principal pour N2 — N1 groupe A/B/C, Ligue 3, N2 groupe A à H.
//   - Transfermarkt (secours N2 uniquement) — N2 groupe A à H.
//   - epreuves.fff.fr (secours N2 uniquement, désactivé depuis le 02/09 —
//     voir sync-fff-match-stats-n2-scheduled.yml) — N2 groupe A à H.
// Une capture visuelle réelle tranche sans ambiguïté ce qu'un statut HTTP
// ou un compte de joueurs rapprochés ne permet pas de voir : page de
// blocage anti-bot, CAPTCHA, page vide, contenu normal revenu, etc.
// Vrai navigateur Chromium standard, sans aucun contournement (pas de
// proxy, pas de rotation d'IP, pas d'usurpation d'empreinte) — juste une
// navigation normale, comme le ferait n'importe quel visiteur.
// Les captures sont enregistrées dans ./captures pour être publiées comme
// artefact + branche diagnostic-captures (aucune écriture en base).
import { chromium } from 'playwright';
import fs from 'fs';

const DOSSIER = 'captures';
fs.mkdirSync(DOSSIER, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  viewport: { width: 1400, height: 1000 },
});

const resultats = [];

// Signatures textuelles déjà observées pour un blocage confirmé — permet un
// résumé texte rapide (etat.json) sans avoir à ouvrir chaque capture à
// chaque vérification ; en cas de doute ou de nouveau motif, la capture
// PNG reste la source de vérité.
function sembleBloque(statut, titre) {
  if (statut === 403) return true;
  const t = (titre || '').toLowerCase();
  return t.includes('access denied') || t.includes('momentanément indisponible') || t.includes('moment donné') || t.includes('captcha');
}

async function capture(nom, url, options = {}) {
  console.log(`\n=== ${nom} ===`);
  console.log(`URL : ${url}`);
  const entree = { nom, url, statut: null, titre: null, erreur: null, bloque: null };
  try {
    const reponse = await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
    entree.statut = reponse ? reponse.status() : null;
    entree.titre = await page.title();
    entree.bloque = sembleBloque(entree.statut, entree.titre);
    console.log(`Statut HTTP : ${entree.statut}`);
    console.log(`Titre de la page : "${entree.titre}"`);
    console.log(`Semble bloqué : ${entree.bloque}`);
    if (options.attendre) await page.waitForTimeout(options.attendre);
    const chemin = `${DOSSIER}/${nom}.png`;
    await page.screenshot({ path: chemin, fullPage: true });
    console.log(`Capture enregistrée : ${chemin}`);
  } catch (e) {
    entree.erreur = e.message.split('\n')[0];
    entree.bloque = true;
    console.log(`Erreur navigation : ${entree.erreur}`);
    try { await page.screenshot({ path: `${DOSSIER}/${nom}-erreur.png`, fullPage: true }); } catch {}
  }
  resultats.push(entree);
  return entree;
}

const GROUPES_N2 = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const GROUPES_N1 = ['A', 'B', 'C'];
const GPNO_FFF = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8 };

// ---- 1) lequipe.fr — source unique pour N1/Ligue 3, secours principal pour N2 ----
for (const g of GROUPES_N1) {
  await capture(`lequipe-n1-groupe-${g.toLowerCase()}`, `https://www.lequipe.fr/Football/national-1-groupe-${g.toLowerCase()}/page-calendrier-resultats`);
}
await capture('lequipe-ligue-3', 'https://www.lequipe.fr/Football/ligue-3/page-calendrier-resultats');
for (const g of GROUPES_N2) {
  await capture(`lequipe-n2-groupe-${g.toLowerCase()}`, `https://www.lequipe.fr/Football/national-2-groupe-${g.toLowerCase()}/page-calendrier-resultats`);
}

// ---- 2) Transfermarkt — secours N2 uniquement ----
for (const g of GROUPES_N2) {
  await capture(
    `transfermarkt-n2-groupe-${g.toLowerCase()}`,
    `https://www.transfermarkt.fr/national-2/spieltag/wettbewerb/FR5${g}/saison_id/2026/spieltag/1`,
    { attendre: 800 },
  );
}

// ---- 3) epreuves.fff.fr — secours N2, désactivé depuis le 02/09 ----
for (const g of GROUPES_N2) {
  await capture(
    `fff-n2-groupe-${g.toLowerCase()}`,
    `https://epreuves.fff.fr/competition/engagement/3-n2/phase/1/${GPNO_FFF[g]}/resultats-et-calendrier`,
    { attendre: 1000 },
  );
}

await browser.close();

console.log('\n=== Résumé ===');
let totalBloques = 0;
for (const r of resultats) {
  const etat = r.erreur ? `ERREUR (${r.erreur})` : `statut=${r.statut}, titre="${r.titre}", bloqué=${r.bloque}`;
  if (r.bloque) totalBloques++;
  console.log(`  ${r.nom} : ${etat}`);
}
console.log(`\n${totalBloques}/${resultats.length} page(s) semblent bloquées.`);

fs.writeFileSync(`${DOSSIER}/etat.json`, JSON.stringify({
  genereLe: new Date().toISOString(),
  resultats,
}, null, 2));
console.log(`\nÉtat écrit : ${DOSSIER}/etat.json`);
console.log('\nTerminé.');
