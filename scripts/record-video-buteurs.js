// Enregistre une vidéo de démonstration (lecture seule, aucune écriture en
// base), version longue : d'abord la page de présentation du site (page
// d'accueil, couverture), puis le vrai profil de plusieurs joueurs
// (historique de matchs déroulé, badge "vérifié FFF"). Format vertical
// (Reel) mais navigation sur le vrai site, pas des cartes générées.
//
// Même technique que record-demo-video.js pour débloquer temporairement
// l'historique de matchs (canHistory) : copie modifiée de
// footlight-profil.html servie depuis un répertoire temporaire, jamais
// commit, uniquement pour ce qui est filmé.
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { createServer } from 'node:http';
import { readFile, cp, mkdtemp, mkdir, readdir, writeFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const noms = (process.env.NOMS || '').split(',').map((s) => s.trim()).filter(Boolean);
const saisonCible = process.env.SAISON_CIBLE || '2026-2027';
const outDir = process.env.OUT_DIR || path.join(repoRoot, 'demo-video-out');
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!noms.length) { console.error('NOMS manquant (liste "Prénom Nom" séparés par des virgules).'); process.exit(1); }
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

// ---- 0. Résolution des noms en joueur_id ----
const joueurs = [];
for (const nomComplet of noms) {
  const [prenom, ...reste] = nomComplet.split(' ');
  const nom = reste.join(' ');
  const { data, error } = await supabase.from('joueurs').select('id, prenom, nom, club').ilike('prenom', `%${prenom}%`).ilike('nom', `%${nom}%`).limit(1).single();
  if (error || !data) { console.log(`Introuvable, ignoré : "${nomComplet}" (${error?.message || 'aucun résultat'})`); continue; }
  console.log(`Trouvé : ${data.prenom} ${data.nom} (${data.club}) — id=${data.id}`);
  joueurs.push(data);
}
if (!joueurs.length) { console.error('Aucun des noms fournis n\'a été trouvé.'); process.exit(1); }

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
// La sidebar "Filtres" (recherche rapide pour recruteurs) passe en pleine
// largeur au-dessus du profil sur un écran étroit (<800px, voir la media
// query .sidebar dans le <style>) — masquée pour la démo verticale, sinon
// la vidéo montre la recherche avant le vrai profil du joueur.
profilHtml = profilHtml.replace('</head>', '<style>.sidebar{display:none!important;}</style></head>');
await writeFile(profilPath, profilHtml, 'utf8');

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

// --- Scène 1 : page de présentation du site (couverture, accueil) ---
console.log('Ouverture de la page d\'accueil (couverture)...');
await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(2500);
for (const y of [600, 1400, 2200, 3000, 3800]) {
  await page.evaluate((yy) => window.scrollTo({ top: yy, behavior: 'smooth' }), y);
  await page.waitForTimeout(1800);
}
await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
await page.waitForTimeout(1200);

// --- Scènes suivantes : un profil réel par joueur ---
for (const j of joueurs) {
  console.log(`Ouverture du profil de ${j.prenom} ${j.nom}...`);
  await page.goto(`http://127.0.0.1:${port}/footlight-profil.html?id=${j.id}`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2000);

  const selectExiste = await page.$('#season-select');
  if (selectExiste) {
    await page.selectOption('#season-select', saisonCible).catch(() => {});
    await page.waitForTimeout(1500);
  }

  await page.waitForTimeout(1500);
  for (const y of [500, 1100, 1700, 2300, 2900]) {
    await page.evaluate((yy) => window.scrollTo({ top: yy, behavior: 'smooth' }), y);
    await page.waitForTimeout(1600);
  }
  await page.waitForTimeout(1200);
}

await context.close();
await browser.close();
server.close();

const fichiers = await readdir(outDir);
const video = fichiers.find((f) => f.endsWith('.webm'));
console.log(`Vidéo générée : ${video ? path.join(outDir, video) : '(aucune trouvée)'}`);
