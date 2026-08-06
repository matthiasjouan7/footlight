// Enregistre une vidéo de démonstration du parcours recruteur (lecture
// seule, aucune écriture en base) : page d'accueil, puis inscription
// recruteur (club / agent / scout), puis ce qu'un recruteur voit une fois
// connecté (recherche avec filtres, profil joueur complet).
//
// Deux points nécessitent une copie locale modifiée du site, jamais commit,
// uniquement pour ce qui est filmé :
// 1. footlight-profil.html / footlight-recherche.html : viewerRole/viewerPlan
//    forcés à 'recruteur'/'premium' pour montrer la vue Premium sans avoir
//    de vrai compte connecté (même technique que pour la vidéo joueur).
// 2. footlight-inscription-recruteur.html : à l'étape de confirmation, on
//    n'appelle jamais createAcc() (qui écrit en base) — l'écran de succès
//    est affiché directement en DOM pour la démo.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, cp, mkdtemp, mkdir, readdir, writeFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const joueurId = process.env.JOUEUR_ID || 'd3925e36-79c3-4da6-8dd3-c204a585c99f'; // Jordan Cuvier
const outDir = process.env.OUT_DIR || path.join(repoRoot, 'demo-video-recruteur-out');

// ---- 1. Copie temporaire du site avec viewerRole/viewerPlan forcés (démo uniquement) ----
const tmpSite = await mkdtemp(path.join(os.tmpdir(), 'footlight-demo-recruteur-'));
for (const entry of await readdir(repoRoot, { withFileTypes: true })) {
  if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'scripts' || entry.name === '.github') continue;
  await cp(path.join(repoRoot, entry.name), path.join(tmpSite, entry.name), { recursive: true });
}

async function forcerVueRecruteurPremium(fichier) {
  const p = path.join(tmpSite, fichier);
  let html = await readFile(p, 'utf8');
  const avant = html;
  html = html
    .replace("let viewerRole = 'anonyme';", "let viewerRole = 'recruteur'; // DEMO uniquement (copie temporaire, jamais commit)")
    .replace("let viewerPlan = 'free';", "let viewerPlan = 'premium'; // DEMO uniquement (copie temporaire, jamais commit)");
  if (html === avant) console.error(`Motifs viewerRole/viewerPlan non trouvés dans ${fichier}, la page ne sera pas modifiée.`);
  await writeFile(p, html, 'utf8');
}
await forcerVueRecruteurPremium('footlight-profil.html');
await forcerVueRecruteurPremium('footlight-recherche.html');

// ---- 2. Serveur statique local ----
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const server = createServer(async (req, res) => {
  try {
    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    const filePath = path.join(tmpSite, urlPath === '/' ? '/index.html' : urlPath);
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

// ---- 3. Enregistrement vidéo ----
await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1350, height: 1080 },
  recordVideo: { dir: outDir, size: { width: 1350, height: 1080 } },
});
const page = await context.newPage();

// --- Scène 1 : page d'accueil, juste le hero (pas de scroll) ---
console.log('Ouverture de la page d\'accueil (couverture)...');
await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(3000);

// --- Scène 2 : inscription recruteur ---
console.log('Ouverture de l\'inscription recruteur...');
await page.goto(`http://127.0.0.1:${port}/footlight-inscription-recruteur.html`, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1500);

console.log('Étape 1 — Qui êtes-vous (club / agent / scout)...');
for (const id of ['tclub', 'tagent', 'tscout']) {
  await page.click(`#${id}`);
  await page.waitForTimeout(900);
}
await page.click('#tclub');
await page.waitForTimeout(600);

await page.fill('#r-prenom', 'Camille');
await page.waitForTimeout(300);
await page.fill('#r-nom', 'Durand');
await page.waitForTimeout(300);
await page.fill('#r-orga', 'FC Lumière');
await page.waitForTimeout(300);
await page.fill('#r-email', 'camille.durand@fclumiere.fr');
await page.waitForTimeout(300);
await page.fill('#r-pass', 'demofootlight');
await page.waitForTimeout(1200);
await page.click('#bnxt');
await page.waitForTimeout(1200);

console.log('Étape 2 — Choix du plan...');
await page.click('#ppro');
await page.waitForTimeout(1000);
await page.click('#ppremium');
await page.waitForTimeout(1600);
await page.click('#bnxt');
await page.waitForTimeout(1200);

console.log('Étape 3 — Confirmation...');
await page.click('.cgvu');
await page.waitForTimeout(1800);

// On n'appelle jamais createAcc() (écriture réelle en base) : on simule
// juste l'écran de succès en DOM pour la démo.
console.log('Simulation de l\'écran de succès (aucune écriture en base)...');
await page.evaluate(() => {
  document.getElementById('step-3').classList.remove('active');
  document.getElementById('bottombar').style.display = 'none';
  document.getElementById('progress').style.display = 'none';
  document.getElementById('sucsub').textContent = 'Compte créé ! Passez au paiement.';
  document.getElementById('suc').classList.add('show');
  window.scrollTo(0, 0);
});
await page.waitForTimeout(2600);

// --- Scène 3 : ce que voit un recruteur — recherche avec filtres ---
console.log('Ouverture de la recherche (vue recruteur Premium)...');
await page.goto(`http://127.0.0.1:${port}/footlight-recherche.html`, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(2400);
for (const y of [400, 900]) {
  await page.evaluate((yy) => window.scrollTo({ top: yy, behavior: 'smooth' }), y);
  await page.waitForTimeout(1600);
}
await page.waitForTimeout(1200);

// --- Scène 4 : profil joueur complet (vue recruteur Premium) ---
console.log('Ouverture du profil joueur (vue recruteur Premium)...');
await page.goto(`http://127.0.0.1:${port}/footlight-profil.html?id=${joueurId}`, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(2200);
for (const y of [400, 900, 1500, 2100, 2700]) {
  await page.evaluate((yy) => window.scrollTo({ top: yy, behavior: 'smooth' }), y);
  await page.waitForTimeout(1700);
}
await page.waitForTimeout(1500);

// --- Scène 4bis : bascule sur la saison précédente (historique, réservé Pro/Premium) ---
const seasonY = await page.evaluate(() => {
  const el = document.getElementById('season-select');
  return el ? el.getBoundingClientRect().top + window.scrollY - 40 : null;
});
if (seasonY != null) {
  console.log('Retour au sélecteur de saison...');
  await page.evaluate((yy) => window.scrollTo({ top: yy, behavior: 'smooth' }), seasonY);
  await page.waitForTimeout(1600);

  const saisonPrecedente = await page.evaluate(() => {
    const el = document.getElementById('season-select');
    if (!el) return null;
    const current = el.value;
    const opt = Array.from(el.options).find((o) => o.value !== current && o.value !== 'global');
    return opt ? opt.value : null;
  });

  if (saisonPrecedente) {
    console.log(`Sélection de la saison précédente (${saisonPrecedente})...`);
    await page.selectOption('#season-select', saisonPrecedente).catch(() => console.log('Impossible de sélectionner la saison précédente.'));
    await page.waitForTimeout(2200);
    for (const y of [seasonY + 300, seasonY + 900]) {
      await page.evaluate((yy) => window.scrollTo({ top: yy, behavior: 'smooth' }), y);
      await page.waitForTimeout(1700);
    }
  } else {
    console.log('Pas de saison précédente disponible pour ce joueur — étape ignorée.');
  }
}

// --- Scène 4ter : export PDF (bouton "Télécharger la fiche", réservé Premium) ---
console.log('Mise en avant de l\'export PDF...');
const exportBtn = page.locator('button:has-text("Télécharger la fiche")').first();
if (await exportBtn.count()) {
  await exportBtn.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1400);
  await exportBtn.hover();
  await page.waitForTimeout(1800);
} else {
  console.log('Bouton export PDF introuvable — étape ignorée.');
}

await context.close();
await browser.close();
server.close();

const fichiers = await readdir(outDir);
const video = fichiers.find((f) => f.endsWith('.webm'));
console.log(`Vidéo générée : ${video ? path.join(outDir, video) : '(aucune trouvée)'}`);
