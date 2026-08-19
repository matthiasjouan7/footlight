// Enregistre un Reel (lecture seule, aucune écriture en base) sur la reprise
// du National 1 : rappelle les deux records de la saison 2025-2026 (Ibrahima
// Keita, 17 buts ; Chafik Abbas, 14 passes décisives) puis relance sur "qui
// va leur succéder cette saison ?". Format vertical.
//
// Les deux joueurs sont présentés via des cartes générées, pas une
// navigation sur un vrai profil du site : Chafik Abbas n'existe pas en base
// (recherché sous les deux ordres nom/prénom, aucun résultat), et pour
// garder les deux scènes cohérentes entre elles, Ibrahima Keita (qui a un
// vrai profil, VFC La Roche-sur-Yon) utilise la même carte plutôt qu'une
// navigation réelle.
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { createServer } from 'node:http';
import { cp, mkdtemp, mkdir, readdir } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const outDir = process.env.OUT_DIR || path.join(repoRoot, 'demo-video-out');
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

// ---- 0. Résolution du profil réel d'Ibrahima Keita ----
const { data: keita, error: keitaErr } = await supabase
  .from('joueurs').select('id, prenom, nom, club').ilike('prenom', '%Ibrahima%').ilike('nom', '%Keita%').limit(1).single();
if (keitaErr || !keita) { console.error(`Ibrahima Keita introuvable : ${keitaErr?.message || 'aucun résultat'}`); process.exit(1); }
console.log(`Trouvé : ${keita.prenom} ${keita.nom} (${keita.club}) — id=${keita.id}`);

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
.recordcard{background:#161b22;border:1px solid #30363d;border-radius:16px;padding:28px 24px;width:100%;max-width:520px;text-align:center;}
.recordcard .nom{font-size:1.3rem;font-weight:800;margin-bottom:4px;}
.recordcard .club{font-size:0.85rem;color:#8b949e;margin-bottom:18px;}
.recordcard .val{font-size:3.4rem;font-weight:900;color:#e3b341;line-height:1;margin-bottom:6px;}
.recordcard .lbl{font-size:0.78rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#8b949e;}
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
<div class="eyebrow">National 1 — Saison 2026-2027</div>
<h1>Le National <span>reprend ses droits</span> ce week-end</h1>
`));
await page.waitForTimeout(3800);

// --- Scène 2 : record Keita (carte générée) ---
console.log('Scène 2 : record Ibrahima Keita...');
await page.setContent(pageHtml(`
<div class="eyebrow">Saison 2025-2026 — Meilleur buteur</div>
<div class="recordcard">
  <div class="nom">Ibrahima Keita</div>
  <div class="club">${keita.club}</div>
  <div class="val">17</div>
  <div class="lbl">Buts</div>
</div>
`));
await page.waitForTimeout(3800);

// --- Scène 3 : record Abbas (carte générée, pas de profil réel) ---
console.log('Scène 3 : record Chafik Abbas...');
await page.setContent(pageHtml(`
<div class="eyebrow">Saison 2025-2026 — Meilleur passeur</div>
<div class="recordcard">
  <div class="nom">Chafik Abbas</div>
  <div class="club">AS Cannes</div>
  <div class="val">14</div>
  <div class="lbl">Passes décisives</div>
</div>
`));
await page.waitForTimeout(3800);

// --- Scène 4 : relance + CTA ---
console.log('Scène 4 : relance...');
await page.setContent(pageHtml(`
<h1>Qui va <span>leur succéder</span> cette saison ?</h1>
<div class="cta">Suis les stats en direct sur <b>footlight.fr</b></div>
`));
await page.waitForTimeout(4200);

await context.close();
await browser.close();
server.close();

const fichiers = await readdir(outDir);
const video = fichiers.find((f) => f.endsWith('.webm'));
console.log(`Vidéo générée : ${video ? path.join(outDir, video) : '(aucune trouvée)'}`);
