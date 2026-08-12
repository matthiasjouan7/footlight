// Enregistre une vidéo de démonstration du parcours joueur « alerte
// recrutement » : carte de titre d'accroche, puis recherche du club,
// reconnaissance d'un profil déjà importé (ou inscription complète) et
// remplissage de toutes les informations / données / stats demandées.
// Utilise le nom réel « Yves DjeDje » plutôt qu'un nom fictif.
//
// Lecture seule, aucune écriture en base : la recherche de profil existant
// et l'autocomplete club interrogent la vraie base (simples lectures), mais
// on ne clique jamais sur « Oui, c'est moi » ni sur « Créer mon profil »
// (qui appelleraient db.auth.signUp / db.from('joueurs').insert). L'écran
// de succès final est simulé directement en DOM, comme pour la vidéo
// recruteur.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readdir, mkdir } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const outDir = process.env.OUT_DIR || path.join(repoRoot, 'demo-video-alerte-recrutement-out');

// ---- 1. Serveur statique local (sert le dépôt tel quel, aucune copie/patch nécessaire) ----
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const server = createServer(async (req, res) => {
  try {
    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    const filePath = path.join(repoRoot, urlPath === '/' ? '/index.html' : urlPath);
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    createReadStream(filePath).pipe(res);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
console.log(`Serveur local démarré sur http://127.0.0.1:${port}`);

// ---- 2. Enregistrement vidéo ----
await mkdir(outDir, { recursive: true });
const browser = await chromium.launch(process.env.PW_EXECUTABLE_PATH ? { executablePath: process.env.PW_EXECUTABLE_PATH } : {});
const context = await browser.newContext({
  viewport: { width: 1350, height: 1080 },
  recordVideo: { dir: outDir, size: { width: 1350, height: 1080 } },
});
const page = await context.newPage();

// --- Scène 1 : carte de titre « Alerte recrutement » (accroche) ---
console.log('Affichage de la carte de titre « Alerte recrutement »...');
await page.setContent(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
* { margin:0; padding:0; box-sizing:border-box; }
body {
  background:#07090e; min-height:100vh; display:flex; flex-direction:column;
  align-items:center; justify-content:center;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  position:relative; overflow:hidden;
}
.bg-mesh { position:absolute; inset:0;
  background:
    radial-gradient(ellipse 60% 50% at 15% 20%, rgba(79,142,247,0.10) 0%, transparent 60%),
    radial-gradient(ellipse 50% 40% at 85% 80%, rgba(124,106,247,0.09) 0%, transparent 60%),
    radial-gradient(ellipse 40% 30% at 50% 50%, rgba(45,216,130,0.05) 0%, transparent 60%);
}
.logo { position:relative; font-size:1.3rem; font-weight:800; letter-spacing:0.5px;
  background:linear-gradient(90deg,#4f8ef7,#7c6af7); -webkit-background-clip:text; -webkit-text-fill-color:transparent;
  margin-bottom:36px;
}
.bell { position:relative; font-size:3.2rem; margin-bottom:18px; }
h1 { position:relative; font-size:3.4rem; font-weight:800; text-align:center; color:#f0f2f7;
  letter-spacing:-1px; line-height:1.1; margin-bottom:18px; max-width:820px; }
h1 span { background:linear-gradient(90deg,#4f8ef7,#7c6af7); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
p { position:relative; font-size:1.05rem; color:#8b93a8; text-align:center; max-width:560px; line-height:1.6; }
</style></head>
<body>
<div class="bg-mesh"></div>
<div class="logo">FootLight</div>
<div class="bell">🔔</div>
<h1>Alerte <span>recrutement</span></h1>
<p>Cherche ton club, retrouve ton profil (ou inscris-toi), renseigne toutes tes infos et tes stats.</p>
</body></html>`);
await page.waitForTimeout(3200);

// --- Scène 2 : page d'accueil (couverture) ---
console.log('Ouverture de la page d\'accueil...');
await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(2200);

// --- Scène 3 : inscription joueur — étape 1, identité ---
console.log('Ouverture de l\'inscription joueur...');
await page.goto(`http://127.0.0.1:${port}/footlight-inscription-joueur.html`, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1500);

console.log('Étape 1 — Identité...');
await page.fill('#f-prenom', 'Yves');
await page.waitForTimeout(350);
await page.fill('#f-nom', 'DjeDje');
await page.waitForTimeout(350);
await page.fill('#f-naissance', '2001-04-25');
await page.waitForTimeout(300);
await page.fill('#f-nationalite', 'Française');
await page.waitForTimeout(300);
await page.fill('#f-telephone', '06 12 34 56 78');
await page.waitForTimeout(300);
await page.fill('#f-email', 'yves.djedje.demo@footlight-demo.fr');
await page.waitForTimeout(300);
await page.fill('#f-password', 'demofootlight1');
await page.waitForTimeout(1200);

console.log('Vérification d\'un profil déjà existant (lecture seule)...');
await page.click('#btn-next');

// --- Scène 3 : reconnaissance d'un profil déjà importé ("trouve ton profil") ---
const claimApparu = await page.waitForSelector('#step-claim.active .claim-card', { timeout: 15000 }).then(() => true).catch(() => false);
if (claimApparu) {
  console.log('Profil déjà importé détecté — mise en avant de la carte...');
  await page.waitForTimeout(2200);
  // On ne clique jamais "Oui, c'est moi" (écrirait en base) : on choisit de
  // continuer sur un nouveau profil pour montrer aussi le parcours complet
  // d'inscription et de remplissage des données.
  await page.click('.claim-skip');
  await page.waitForTimeout(1200);
} else {
  console.log('Aucun profil existant détecté pour cette démo — poursuite directe.');
}

// --- Scène 4 : étape 2, profil sportif ---
console.log('Étape 2 — Profil sportif...');
await page.click('#poste-grid .pos-card:has-text("Milieu central")');
await page.waitForTimeout(700);
await page.selectOption('#f-pied', 'Droit');
await page.waitForTimeout(400);
await page.fill('#f-taille', '178');
await page.waitForTimeout(300);
await page.fill('#f-poids', '72');
await page.waitForTimeout(400);
await page.selectOption('#f-poste2', 'milieu_offensif');
await page.waitForTimeout(400);
await page.click('.chips-wrap .chip-opt:has-text("N2")');
await page.waitForTimeout(1200);
await page.click('#btn-next');
await page.waitForTimeout(1000);

// --- Scène 5 : étape 3, recherche du club + saison + stats ---
console.log('Étape 3 — Recherche du club...');
await page.locator('#f-club').pressSequentially('Bourgoin', { delay: 130 });
await page.waitForSelector('#f-club-suggestions .club-suggestion', { timeout: 10000 }).catch(() => console.log('Aucune suggestion de club trouvée pour "Bourgoin".'));
await page.waitForTimeout(1000);
const suggestion = page.locator('.club-suggestion').first();
if (await suggestion.count()) {
  await suggestion.click();
} else {
  await page.fill('#f-club', 'FC Bourgoin-Jallieu');
}
await page.waitForTimeout(900);
await page.selectOption('#f-niveau', 'N2');
await page.waitForTimeout(1200);

console.log('Saisie des stats de la saison...');
await page.fill('#s-matchs', '14');
await page.waitForTimeout(250);
await page.fill('#s-buts', '4');
await page.waitForTimeout(250);
await page.fill('#s-passes', '6');
await page.waitForTimeout(250);
await page.fill('#s-minutes', '1120');
await page.waitForTimeout(250);
await page.fill('#s-cartj', '2');
await page.waitForTimeout(250);
await page.fill('#s-cartr', '0');
await page.waitForTimeout(1400);
await page.click('#btn-next');
await page.waitForTimeout(1000);

// --- Scène 6 : étape 4, GPS, vidéo, points forts, bio ---
console.log('Étape 4 — GPS & vidéo...');
await page.click('.gps-card:has-text("Garmin")');
await page.waitForTimeout(900);
await page.fill('.video-link-input', 'https://youtube.com/watch?v=demoyvesdjedje');
await page.waitForTimeout(900);
await page.click('text=+ Ajouter un point fort');
await page.waitForTimeout(500);
await page.fill('.point-fort-label', 'Vision de jeu');
await page.waitForTimeout(900);
await page.fill('#f-bio', 'Milieu de terrain complet, bon volume de jeu et vision de passe. Toujours disponible pour organiser le jeu depuis le premier tiers.');
await page.waitForTimeout(700);
await page.fill('#f-points-amelioration', 'Travaille sa frappe de loin et son jeu de tête défensif.');
await page.waitForTimeout(1400);
await page.click('#btn-next');
await page.waitForTimeout(1200);

// --- Scène 7 : étape 5, récapitulatif ---
console.log('Étape 5 — Récapitulatif...');
for (const y of [200, 500, 900]) {
  await page.evaluate((yy) => window.scrollTo({ top: yy, behavior: 'smooth' }), y);
  await page.waitForTimeout(1500);
}
await page.click('#rgpd-box');
await page.waitForTimeout(1200);
await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
await page.waitForTimeout(1000);

// On ne clique jamais "Créer mon profil ✓" (appellerait signUp + insert en
// base) : on simule l'écran de succès directement en DOM pour la démo,
// même technique que pour la vidéo recruteur.
console.log('Simulation de l\'écran de succès (aucune écriture en base)...');
await page.evaluate(() => {
  for (let i = 1; i <= 5; i++) document.getElementById(`step-${i}`).classList.remove('active');
  document.getElementById('progress-wrap').style.display = 'none';
  document.getElementById('bottom-bar').style.display = 'none';
  const prenom = document.getElementById('f-prenom').value.trim();
  const nom = document.getElementById('f-nom').value.trim();
  const initiales = ((prenom[0] || '') + (nom[0] || '')).toUpperCase();
  const club = document.getElementById('f-club').value;
  const niveau = document.getElementById('f-niveau').value;
  const poste = (typeof selectedPoste !== 'undefined' ? selectedPoste : '').replace(/_/g, ' ');
  document.getElementById('success-avatar').textContent = initiales;
  document.getElementById('success-name').textContent = `${prenom} ${nom}`;
  document.getElementById('success-detail').textContent = `${poste} · ${club} · ${niveau}`;
  document.getElementById('success-screen').classList.add('visible');
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
await page.waitForTimeout(3000);

await context.close();
await browser.close();
server.close();

const fichiers = await readdir(outDir);
const video = fichiers.find((f) => f.endsWith('.webm'));
console.log(`Vidéo générée : ${video ? path.join(outDir, video) : '(aucune trouvée)'}`);
