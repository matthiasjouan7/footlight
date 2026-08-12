// Enregistre une vidéo courte, format réseaux sociaux (vertical 9:16), pour
// une « alerte recrutement » : des joueurs en recherche de club, mis en
// avant via leur vraie fiche FootLight. Lecture seule, aucune écriture en
// base.
//
// Pour chaque joueur, la recherche se fait directement via le paramètre
// ?prenom=&nom= déjà géré par footlight-profil.html (recherche ilike côté
// serveur, sans filtre profil_public — la même fonctionnalité que l'appli
// utilise en production). Comme pour la vidéo recruteur existante, on force
// viewerRole/viewerPlan sur une copie temporaire du site (jamais commit)
// pour afficher la fiche complète (stats, historique, badge...) sans avoir
// de vrai compte recruteur Premium connecté.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, cp, mkdtemp, mkdir, readdir, writeFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const outDir = process.env.OUT_DIR || path.join(repoRoot, 'demo-video-alerte-recrutement-reseaux-out');

const JOUEURS = [
  { prenom: 'Yves', nom: 'DjeDje' },
  { prenom: 'Luderic', nom: 'Etonde' },
  { prenom: 'Adama', nom: 'Diop' },
  { prenom: 'Salim', nom: 'Jabi' },
];

// ---- 1. Copie temporaire du site avec viewerRole/viewerPlan forcés (démo uniquement) ----
const tmpSite = await mkdtemp(path.join(os.tmpdir(), 'footlight-demo-reseaux-'));
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

// ---- 3. Enregistrement vidéo (format vertical, réseaux sociaux) ----
await mkdir(outDir, { recursive: true });
const browser = await chromium.launch(process.env.PW_EXECUTABLE_PATH ? { executablePath: process.env.PW_EXECUTABLE_PATH } : {});
const VIEWPORT = { width: 720, height: 1280 };
const context = await browser.newContext({
  viewport: VIEWPORT,
  recordVideo: { dir: outDir, size: VIEWPORT },
});
const page = await context.newPage();

function titleCardHtml({ emoji, title, titleAccent, subtitle }) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
* { margin:0; padding:0; box-sizing:border-box; }
body {
  background:#07090e; min-height:100vh; display:flex; flex-direction:column;
  align-items:center; justify-content:center;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  position:relative; overflow:hidden; padding:0 40px;
}
.bg-mesh { position:absolute; inset:0;
  background:
    radial-gradient(ellipse 60% 50% at 15% 20%, rgba(79,142,247,0.10) 0%, transparent 60%),
    radial-gradient(ellipse 50% 40% at 85% 80%, rgba(124,106,247,0.09) 0%, transparent 60%),
    radial-gradient(ellipse 40% 30% at 50% 50%, rgba(45,216,130,0.05) 0%, transparent 60%);
}
.logo { position:relative; font-size:1.2rem; font-weight:800; letter-spacing:0.5px;
  background:linear-gradient(90deg,#4f8ef7,#7c6af7); -webkit-background-clip:text; -webkit-text-fill-color:transparent;
  margin-bottom:32px;
}
.emoji { position:relative; font-size:3rem; margin-bottom:16px; }
h1 { position:relative; font-size:2.6rem; font-weight:800; text-align:center; color:#f0f2f7;
  letter-spacing:-1px; line-height:1.15; margin-bottom:16px; max-width:560px; }
h1 span { background:linear-gradient(90deg,#4f8ef7,#7c6af7); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
p { position:relative; font-size:1rem; color:#8b93a8; text-align:center; max-width:480px; line-height:1.6; }
</style></head>
<body>
<div class="bg-mesh"></div>
<div class="logo">FootLight</div>
<div class="emoji">${emoji}</div>
<h1>${title} <span>${titleAccent}</span></h1>
<p>${subtitle}</p>
</body></html>`;
}

// --- Scène 1 : carte de titre « Alerte recrutement » ---
console.log('Affichage de la carte de titre...');
await page.setContent(titleCardHtml({
  emoji: '🔔',
  title: 'Alerte',
  titleAccent: 'recrutement',
  subtitle: 'Ils sont prêts à rejoindre un nouveau club. Découvre leur profil sur FootLight.',
}));
await page.waitForTimeout(3200);

async function scrollThroughProfile(steps = 5, msParStep = 1400) {
  const { scrollHeight, viewportH } = await page.evaluate(() => ({
    scrollHeight: document.body.scrollHeight,
    viewportH: window.innerHeight,
  }));
  const maxScroll = Math.max(scrollHeight - viewportH, 0);
  for (let i = 1; i <= steps; i++) {
    const y = Math.round((maxScroll * i) / steps);
    await page.evaluate((yy) => window.scrollTo({ top: yy, behavior: 'smooth' }), y);
    await page.waitForTimeout(msParStep);
  }
}

// --- Scènes suivantes : un joueur en recherche de club par fiche ---
const trouves = [];
const introuvables = [];
for (const { prenom, nom } of JOUEURS) {
  console.log(`Recherche du profil de ${prenom} ${nom}...`);
  const url = `http://127.0.0.1:${port}/footlight-profil.html?prenom=${encodeURIComponent(prenom)}&nom=${encodeURIComponent(nom)}`;
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1400);

  const notFound = await page.evaluate(() => {
    const el = document.getElementById('not-found');
    return !!el && getComputedStyle(el).display !== 'none';
  });

  if (notFound) {
    console.log(`Profil introuvable pour ${prenom} ${nom} — carte de remplacement affichée.`);
    introuvables.push(`${prenom} ${nom}`);
    await page.setContent(titleCardHtml({
      emoji: '⚽',
      title: prenom,
      titleAccent: nom,
      subtitle: 'En recherche de club · Profil bientôt disponible sur FootLight.',
    }));
    await page.waitForTimeout(2600);
    continue;
  }

  console.log(`Profil de ${prenom} ${nom} trouvé — parcours de la fiche...`);
  trouves.push(`${prenom} ${nom}`);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'auto' }));
  await page.waitForTimeout(1400);
  await scrollThroughProfile(5, 1400);
  await page.waitForTimeout(800);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await page.waitForTimeout(700);
}

// --- Scène finale : appel à l'action ---
console.log('Affichage de la carte de clôture...');
await page.setContent(titleCardHtml({
  emoji: '📣',
  title: 'Recrute',
  titleAccent: 'sur FootLight',
  subtitle: 'Cherche ton club, ou trouve ton prochain joueur — footlight.fr',
}));
await page.waitForTimeout(3200);

await context.close();
await browser.close();
server.close();

console.log(`Profils trouvés (${trouves.length}/${JOUEURS.length}) : ${trouves.join(', ') || '(aucun)'}`);
if (introuvables.length) console.log(`Profils introuvables : ${introuvables.join(', ')}`);

const fichiers = await readdir(outDir);
const video = fichiers.find((f) => f.endsWith('.webm'));
console.log(`Vidéo générée : ${video ? path.join(outDir, video) : '(aucune trouvée)'}`);
