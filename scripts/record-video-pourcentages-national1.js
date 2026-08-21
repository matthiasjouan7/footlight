// Enregistre un Reel (lecture seule, aucune écriture en base), pour clore
// la série National 1 : les pourcentages qui comptent. Youba Dramé (Goal
// FC, National 1) auteur de 15 des 38 buts de son équipe (39,5 %), puis
// deux gardiens à l'efficacité remarquable — Mickael Salamone (Nîmes,
// National 1 : 18 clean sheets sur 28 matchs, 64,3 %) et Valentin
// Rabouille (Bourges, National 1 : 11 clean sheets sur 16 matchs, 68,8 %).
// Format vertical.
//
// Cartes générées (pas de navigation sur un vrai profil du site), même
// technique que record-video-super-remplacants.js.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { cp, mkdtemp, mkdir, readdir } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const outDir = process.env.OUT_DIR || path.join(repoRoot, 'demo-video-out');

// ---- 1. Copie temporaire du site (sert uniquement l'index pour la
// navigation de chauffe ci-dessous, aucune page de profil n'est filmée) ----
const tmpSite = await mkdtemp(path.join(os.tmpdir(), 'footlight-demo-'));
for (const entry of await readdir(repoRoot, { withFileTypes: true })) {
  if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'scripts' || entry.name === '.github') continue;
  await cp(path.join(repoRoot, entry.name), path.join(tmpSite, entry.name), { recursive: true });
}

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

// ---- 3. Enregistrement vidéo (format vertical, façon Reel) ----
await mkdir(outDir, { recursive: true });
const browser = await chromium.launch(process.env.PW_EXECUTABLE_PATH ? { executablePath: process.env.PW_EXECUTABLE_PATH } : {});
const context = await browser.newContext({
  viewport: { width: 720, height: 1280 },
  recordVideo: { dir: outDir, size: { width: 720, height: 1280 } },
});
const page = await context.newPage();

const STYLE = `
*{margin:0;padding:0;box-sizing:border-box;}
body{background:#0d1117;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'Segoe UI',system-ui,sans-serif;padding:0 40px;color:#e6edf3;}
.eyebrow{font-size:0.8rem;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#8b949e;margin-bottom:14px;}
h1{font-size:2.1rem;font-weight:800;text-align:center;line-height:1.25;margin-bottom:32px;}
h1 span{color:#e3b341;}
.recordcard{background:#161b22;border:1px solid #30363d;border-radius:16px;padding:28px 24px;width:100%;max-width:520px;text-align:center;margin-bottom:20px;}
.recordcard .nom{font-size:1.3rem;font-weight:800;margin-bottom:4px;}
.recordcard .club{font-size:0.85rem;color:#8b949e;margin-bottom:18px;}
.recordcard .pct{font-size:4.2rem;font-weight:900;color:#e3b341;line-height:1;margin-bottom:6px;}
.recordcard .lbl{font-size:0.85rem;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:#8b949e;}
.stats-trio{display:flex;gap:16px;width:100%;max-width:520px;}
.stat-box{background:#161b22;border:1px solid #30363d;border-radius:14px;padding:18px 10px;text-align:center;flex:1;}
.stat-box .val{font-size:1.9rem;font-weight:800;color:#56d364;line-height:1;margin-bottom:6px;}
.stat-box .lbl{font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#8b949e;}
.cta{margin-top:24px;font-size:0.85rem;color:#8b949e;}
.cta b{color:#79c0ff;}
`;

function pageHtml(body) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${STYLE}</style></head><body>${body}</body></html>`;
}

// Avant le tout premier rendu sur une page qui n'a jamais navigué,
// Playwright peut encoder les premières frames avec une taille de cadre
// incorrecte tant qu'aucune vraie navigation n'a eu lieu — une navigation
// minimale « chauffe » la taille de frame avant le premier setContent.
await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'commit', timeout: 60000 });

// --- Scène 1 : ouverture ---
console.log('Scène 1 : ouverture...');
await page.setContent(pageHtml(`
<div class="eyebrow">Aujourd'hui</div>
<h1>On termine la série National 1 avec <span>les pourcentages</span> qui comptent</h1>
`));
await page.waitForTimeout(3800);

// --- Scène 2 : Youba Dramé ---
console.log('Scène 2 : Youba Dramé...');
await page.setContent(pageHtml(`
<div class="eyebrow">Buteur décisif</div>
<div class="recordcard">
  <div class="nom">Youba Dramé</div>
  <div class="club">Goal FC — National 1</div>
  <div class="pct">39,5%</div>
  <div class="lbl">des buts de l'équipe</div>
</div>
<div class="stats-trio">
  <div class="stat-box"><div class="val">15</div><div class="lbl">Buts perso</div></div>
  <div class="stat-box"><div class="val">38</div><div class="lbl">Buts équipe</div></div>
</div>
`));
await page.waitForTimeout(4200);

// --- Scène 3 : transition ---
console.log('Scène 3 : transition...');
await page.setContent(pageHtml(`
<h1>Côté gardiens, l'efficacité se mesure aussi en <span>%</span></h1>
`));
await page.waitForTimeout(3200);

// --- Scène 4 : Mickael Salamone ---
console.log('Scène 4 : Mickael Salamone...');
await page.setContent(pageHtml(`
<div class="eyebrow">Clean sheets</div>
<div class="recordcard">
  <div class="nom">Mickael Salamone</div>
  <div class="club">Nîmes — National 1</div>
  <div class="pct">64,3%</div>
  <div class="lbl">de matchs sans encaisser</div>
</div>
<div class="stats-trio">
  <div class="stat-box"><div class="val">18</div><div class="lbl">Clean sheets</div></div>
  <div class="stat-box"><div class="val">28</div><div class="lbl">Matchs</div></div>
</div>
`));
await page.waitForTimeout(4200);

// --- Scène 5 : Valentin Rabouille ---
console.log('Scène 5 : Valentin Rabouille...');
await page.setContent(pageHtml(`
<div class="eyebrow">Clean sheets</div>
<div class="recordcard">
  <div class="nom">Valentin Rabouille</div>
  <div class="club">Bourges — National 1</div>
  <div class="pct">68,8%</div>
  <div class="lbl">de matchs sans encaisser</div>
</div>
<div class="stats-trio">
  <div class="stat-box"><div class="val">11</div><div class="lbl">Clean sheets</div></div>
  <div class="stat-box"><div class="val">16</div><div class="lbl">Matchs</div></div>
</div>
`));
await page.waitForTimeout(4200);

// --- Scène 6 : CTA ---
console.log('Scène 6 : CTA...');
await page.setContent(pageHtml(`
<h1>Les stats <span>en direct</span></h1>
<div class="cta">Suis les stats en direct sur <b>footlight.fr</b></div>
`));
await page.waitForTimeout(4000);

await context.close();
await browser.close();
server.close();

const fichiers = await readdir(outDir);
const video = fichiers.find((f) => f.endsWith('.webm'));
console.log(`Vidéo générée : ${video ? path.join(outDir, video) : '(aucune trouvée)'}`);
