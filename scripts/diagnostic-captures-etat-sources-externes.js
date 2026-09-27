// Diagnostic lecture seule, par capture d'écran, généralisé à TOUTES les
// sources externes utilisées par les synchros (au lieu d'un diagnostic
// ponctuel par cas signalé) : lequipe.fr (calendrier + stats, seule source
// pour N1/Ligue 3), Transfermarkt (secours N2) et epreuves.fff.fr (secours
// N2, désactivé depuis le 02/09 — voir sync-fff-match-stats-n2-scheduled.yml).
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

// Signatures textuelles déjà observées pour un blocage confirmé (voir
// diagnostic-captures-ecran-compositions.js) — permet un résumé texte
// rapide (etat.json) sans avoir à ouvrir chaque capture à chaque
// vérification ; en cas de doute ou de nouveau motif, la capture PNG reste
// la source de vérité.
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

// ---- 1) lequipe.fr — source unique pour N1/Ligue 3, secours principal pour N2 ----
// N1 groupe A : la division la plus critique, sans aucun secours (contrairement à N2).
await capture(
  '1-lequipe-n1-groupe-a',
  'https://www.lequipe.fr/Football/national-1-groupe-a/page-calendrier-resultats',
);
// N2 groupe D : cas déjà signalé (Steenvoorde).
await capture(
  '2-lequipe-n2-groupe-d-j3',
  'https://www.lequipe.fr/Football/national-2-groupe-d/page-calendrier-resultats/3e-journee',
);

// ---- 2) Transfermarkt — secours N2 uniquement ----
await capture(
  '3-transfermarkt-n2-groupe-d-j3-liste',
  'https://www.transfermarkt.fr/national-2/spieltag/wettbewerb/FR5D/saison_id/2026/spieltag/3',
  { attendre: 1000 },
);

// ---- 3) epreuves.fff.fr — secours N2, désactivé depuis le 02/09 (voir sync-fff-match-stats-n2-scheduled.yml) ----
await capture(
  '4-fff-n2-groupe-d',
  'https://epreuves.fff.fr/competition/engagement/3-n2/phase/1/4/resultats-et-calendrier',
  { attendre: 1500 },
);

await browser.close();

console.log('\n=== Résumé ===');
for (const r of resultats) {
  const etat = r.erreur ? `ERREUR (${r.erreur})` : `statut=${r.statut}, titre="${r.titre}", bloqué=${r.bloque}`;
  console.log(`  ${r.nom} : ${etat}`);
}

fs.writeFileSync(`${DOSSIER}/etat.json`, JSON.stringify({
  genereLe: new Date().toISOString(),
  resultats,
}, null, 2));
console.log(`\nÉtat écrit : ${DOSSIER}/etat.json`);
console.log('\nTerminé.');
