// Diagnostic lecture seule, par capture d'écran : plutôt que de déduire
// l'état d'une page depuis un statut HTTP ou un compte de joueurs
// rapprochés, prend une capture visuelle réelle pour trancher sans
// ambiguïté :
//   1) lequipe.fr N2 groupe D (calendrier-resultats, 3e journée) — voir si
//      le blocage 403 constaté via fetch() persiste aussi avec un vrai
//      navigateur (sans aucun contournement : Chromium standard, sans
//      proxy ni rotation d'IP ni usurpation d'empreinte — juste une
//      navigation normale, comme le ferait n'importe quel visiteur).
//   2) Transfermarkt N2 groupe D, journée 3 (liste des matchs) — voir si le
//      match Steenvoorde/Balagne y apparaît du tout.
//   3) La page de ce match sur Transfermarkt (si trouvée) — voir
//      visuellement si une composition/feuille de match existe réellement,
//      ou si la page est vide de ce côté (expliquerait les 0 joueur
//      rapproché malgré 194 noms "non retrouvés").
// Les captures sont enregistrées dans ./captures pour être publiées comme
// artefact du workflow (aucune écriture en base).
import { chromium } from 'playwright';
import fs from 'fs';

const DOSSIER = 'captures';
fs.mkdirSync(DOSSIER, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  viewport: { width: 1400, height: 1000 },
});

async function capture(nom, url, options = {}) {
  console.log(`\n=== ${nom} ===`);
  console.log(`URL : ${url}`);
  try {
    const reponse = await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
    console.log(`Statut HTTP : ${reponse ? reponse.status() : '(inconnu)'}`);
    console.log(`Titre de la page : "${await page.title()}"`);
    if (options.attendre) await page.waitForTimeout(options.attendre);
    const chemin = `${DOSSIER}/${nom}.png`;
    await page.screenshot({ path: chemin, fullPage: true });
    console.log(`Capture enregistrée : ${chemin}`);
    return reponse ? reponse.status() : null;
  } catch (e) {
    console.log(`Erreur navigation : ${e.message.split('\n')[0]}`);
    try { await page.screenshot({ path: `${DOSSIER}/${nom}-erreur.png`, fullPage: true }); } catch {}
    return null;
  }
}

// 1) lequipe.fr N2 groupe D, 3e journée — via un vrai navigateur.
await capture(
  '1-lequipe-n2-groupe-d-j3',
  'https://www.lequipe.fr/Football/national-2-groupe-d/page-calendrier-resultats/3e-journee',
);

// 2) Transfermarkt N2 groupe D, journée 3 — liste des matchs.
await capture(
  '2-transfermarkt-n2-groupe-d-j3-liste',
  'https://www.transfermarkt.fr/national-2/spieltag/wettbewerb/FR5D/saison_id/2026/spieltag/3',
  { attendre: 1000 },
);

// Cherche le lien du match Steenvoorde (quel que soit l'adversaire) dans la page chargée.
const lienSteenvoorde = await page.evaluate(() => {
  const liens = [...document.querySelectorAll('a[href*="/spielbericht/index/spielbericht/"]')];
  for (const a of liens) {
    const ligne = a.closest('tr') || a.closest('div');
    if (ligne && /steenvoorde/i.test(ligne.textContent || '')) return a.getAttribute('href');
  }
  return null;
});
console.log(`\nLien match Steenvoorde trouvé sur Transfermarkt (journée 3) : ${lienSteenvoorde || '(aucun)'}`);

if (lienSteenvoorde) {
  // 3) La page du match elle-même — pour voir si une composition existe visuellement.
  await capture('3-transfermarkt-match-steenvoorde', `https://www.transfermarkt.fr${lienSteenvoorde}`, { attendre: 1000 });
} else {
  console.log('Le match Steenvoorde de la journée 3 n\'apparaît pas dans la liste Transfermarkt de cette journée (voir capture 2 pour vérifier visuellement).');
}

await browser.close();
console.log('\nTerminé.');
