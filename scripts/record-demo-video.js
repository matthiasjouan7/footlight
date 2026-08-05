// Enregistre une vidéo de démonstration (lecture seule, aucune écriture en
// base) : d'abord la page d'accueil (page de couverture, la plus visible),
// puis le profil d'un joueur avec l'historique de saisons déroulé.
//
// L'historique de saisons (canHistory) est normalement réservé au
// propriétaire du profil ou aux recruteurs Pro/Premium connectés. Pour cette
// démo, on sert une copie modifiée de footlight-profil.html (canHistory
// forcé à true) depuis un répertoire temporaire, sans toucher au dépôt ni à
// la base : uniquement pour ce qui est filmé.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, cp, mkdtemp, mkdir, readdir } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const joueurId = process.env.JOUEUR_ID;
const saisonCible = process.env.SAISON_CIBLE || '2025-2026';
const outDir = process.env.OUT_DIR || path.join(repoRoot, 'demo-video-out');

if (!joueurId) { console.error('JOUEUR_ID manquant.'); process.exit(1); }

// ---- 1. Copie temporaire du site avec canHistory forcé (démo uniquement) ----
const tmpSite = await mkdtemp(path.join(os.tmpdir(), 'footlight-demo-'));
for (const entry of await readdir(repoRoot, { withFileTypes: true })) {
  if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'scripts' || entry.name === '.github') continue;
  await cp(path.join(repoRoot, entry.name), path.join(tmpSite, entry.name), { recursive: true });
}
const profilPath = path.join(tmpSite, 'footlight-profil.html');
let profilHtml = await readFile(profilPath, 'utf8');
const avant = profilHtml;
profilHtml = profilHtml.replace(
  /const canHistory = isOwner \|\| \(viewerRole === 'recruteur' && \(viewerPlan === 'pro' \|\| viewerPlan === 'premium'\)\);/,
  'const canHistory = true; // DEMO uniquement (copie temporaire, jamais commit)'
);
if (profilHtml === avant) { console.error('Motif canHistory non trouvé, la page ne sera pas modifiée.'); }
await import('node:fs/promises').then((fs) => fs.writeFile(profilPath, profilHtml, 'utf8'));

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

console.log('Ouverture de la page d\'accueil (couverture)...');
await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(2500);
for (const y of [600, 1400, 2200, 3000, 3800]) {
  await page.evaluate((yy) => window.scrollTo({ top: yy, behavior: 'smooth' }), y);
  await page.waitForTimeout(1800);
}
await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
await page.waitForTimeout(1200);

console.log('Ouverture du profil joueur...');
await page.goto(`http://127.0.0.1:${port}/footlight-profil.html?id=${joueurId}`, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(2000);

const selectExiste = await page.$('#season-select');
if (selectExiste) {
  console.log(`Sélection de la saison ${saisonCible}...`);
  await page.selectOption('#season-select', saisonCible).catch(() => console.log('Impossible de sélectionner la saison (option absente ?).'));
  await page.waitForTimeout(2000);
} else {
  console.log('Sélecteur de saison absent (une seule saison affichée par défaut).');
}

for (const y of [400, 900, 1500, 2100]) {
  await page.evaluate((yy) => window.scrollTo({ top: yy, behavior: 'smooth' }), y);
  await page.waitForTimeout(1800);
}
await page.waitForTimeout(1500);

await context.close();
await browser.close();
server.close();

const fichiers = await readdir(outDir);
const video = fichiers.find((f) => f.endsWith('.webm'));
console.log(`Vidéo générée : ${video ? path.join(outDir, video) : '(aucune trouvée)'}`);
