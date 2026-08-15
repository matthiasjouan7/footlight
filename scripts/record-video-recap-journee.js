// Enregistre une vidéo de récap d'une journée jouée (lecture seule, aucune
// écriture en base) : scène d'ouverture "ils ont répondu présent" listant
// les buteurs réels du jour, puis le vrai profil de chaque joueur (comme
// record-video-buteurs.js), puis une scène de clôture avec la comparaison
// clean sheets de la journée vs la journée précédente (chiffres fournis en
// entrée, non recalculés ici). Format vertical (Reel), navigation sur le
// vrai site.
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
const cleanSheetsActuelles = process.env.CLEAN_SHEETS_ACTUELLES || '';
const cleanSheetsPrecedentes = process.env.CLEAN_SHEETS_PRECEDENTES || '';

if (!noms.length) { console.error('NOMS manquant (liste "Prénom Nom" séparés par des virgules).'); process.exit(1); }
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

// ---- 0. Résolution des noms en joueur_id ----
// Un seul mot fourni (ex: "Samb", "Legendre") : c'est un nom de famille, jamais
// un prénom seul — recherche uniquement sur `nom`. Sinon, essai prénom+nom
// (premier mot = prénom, reste = nom), avec repli sur le nom complet si ça ne
// donne rien (ex: "El Khoumisti" est un nom de famille à deux mots).
// Piège évité : avec un seul mot, un split naïf (prenom=mot, nom='') fait
// matcher n'importe quel joueur via `ilike(nom, '%%')`, qui accepte tout —
// "Samb" retombait alors sur "Samba" Diop (prénom) au lieu de Mansour Samb.
const joueurs = [];
for (const nomComplet of noms) {
  const mots = nomComplet.trim().split(/\s+/);
  let data, error;
  if (mots.length === 1) {
    ({ data, error } = await supabase.from('joueurs').select('id, prenom, nom, club').ilike('nom', `%${nomComplet}%`).order('id').limit(1).maybeSingle());
  } else {
    const [prenom, ...reste] = mots;
    const nom = reste.join(' ');
    ({ data, error } = await supabase.from('joueurs').select('id, prenom, nom, club').ilike('prenom', `%${prenom}%`).ilike('nom', `%${nom}%`).order('id').limit(1).maybeSingle());
    if (!data) {
      const repli = await supabase.from('joueurs').select('id, prenom, nom, club').ilike('nom', `%${nomComplet}%`).order('id').limit(1).maybeSingle();
      data = repli.data;
      error = repli.error;
    }
  }
  if (error || !data) { console.log(`Introuvable, ignoré : "${nomComplet}" (${error?.message || 'aucun résultat'})`); continue; }
  console.log(`Trouvé : ${data.prenom} ${data.nom} (${data.club}) — id=${data.id}`);
  joueurs.push(data);
}
if (!joueurs.length) { console.error('Aucun des noms fournis n\'a été trouvé.'); process.exit(1); }

// ---- 0bis. Dernier match joué de chacun (pour la scène d'ouverture) ----
console.log('Récupération du dernier match joué de chacun...');
const avecStats = [];
for (const j of joueurs) {
  const { data: dernierMatch } = await supabase
    .from('matchs_joueur')
    .select('buts, minutes_jouees, date_match, adversaire')
    .eq('joueur_id', j.id)
    .not('minutes_jouees', 'is', null)
    .order('date_match', { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: tousMatchs } = await supabase
    .from('matchs_joueur')
    .select('buts, minutes_jouees')
    .eq('joueur_id', j.id)
    .not('minutes_jouees', 'is', null);
  const totalButsSaison = (tousMatchs || []).reduce((s, m) => s + (m.buts || 0), 0);
  console.log(`  ${j.prenom} ${j.nom} : dernier match ${dernierMatch?.date_match || '?'} vs ${dernierMatch?.adversaire || '?'} — ${dernierMatch?.buts || 0} but(s) (total saison : ${totalButsSaison})`);
  avecStats.push({ ...j, dernierMatch, totalButsSaison });
}

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
// Sidebar recruteur (recherche rapide) masquée pour la démo : voir
// record-video-buteurs.js pour le détail du bug qu'elle provoque sinon.
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

const STYLE = `
*{margin:0;padding:0;box-sizing:border-box;}
body{background:#0d1117;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'Segoe UI',system-ui,sans-serif;padding:0 40px;color:#e6edf3;}
.eyebrow{font-size:0.8rem;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#8b949e;margin-bottom:14px;}
h1{font-size:2.1rem;font-weight:800;text-align:center;line-height:1.25;margin-bottom:32px;}
h1 span{color:#e3b341;}
.row{display:flex;align-items:center;gap:14px;background:#161b22;border:1px solid #30363d;border-radius:12px;padding:16px 20px;width:100%;max-width:520px;margin-bottom:14px;}
.row .emoji{font-size:1.6rem;}
.row .texte{font-size:0.98rem;font-weight:600;line-height:1.35;}
.cta{margin-top:20px;font-size:0.85rem;color:#8b949e;}
.cta b{color:#79c0ff;}
.stats-duo{display:flex;gap:24px;margin-bottom:20px;}
.stat-box{background:#161b22;border:1px solid #30363d;border-radius:14px;padding:20px 28px;text-align:center;min-width:120px;}
.stat-box .val{font-size:2.4rem;font-weight:800;line-height:1;margin-bottom:6px;}
.stat-box .val.up{color:#56d364;}
.stat-box .val.down{color:#f85149;}
.stat-box .lbl{font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#8b949e;}
`;

// --- Scène 1 : ouverture, ils ont répondu présent ---
function ligneOuverture({ prenom, nom, dernierMatch, totalButsSaison }) {
  const buts = dernierMatch?.buts || 0;
  const premierBut = totalButsSaison === 1 && buts === 1;
  if (premierBut) return { emoji: '🎉', texte: `${prenom} ${nom} — premier but de la saison !` };
  if (buts >= 3) return { emoji: '🔥', texte: `${prenom} ${nom} — triplé, il régale` };
  if (buts === 2) return { emoji: '🔥', texte: `${prenom} ${nom} — doublé, en pleine forme` };
  if (buts === 1) return { emoji: '⚽', texte: `${prenom} ${nom} — buteur, présent à l'appel` };
  return { emoji: '💪', texte: `${prenom} ${nom} — présent sur le terrain` };
}

const ouvertureHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>${STYLE}</style></head>
<body>
<div class="eyebrow">Ligue 3 — Journée</div>
<h1>Les attaquants ont <span>répondu présent</span></h1>
${avecStats.map((p) => { const { emoji, texte } = ligneOuverture(p); return `<div class="row"><div class="emoji">${emoji}</div><div class="texte">${texte}</div></div>`; }).join('\n')}
</body></html>`;

console.log('Affichage de la scène d\'ouverture...');
await page.setContent(ouvertureHtml);
await page.waitForTimeout(4200);

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

// --- Scène finale : clean sheets, journée vs journée précédente ---
if (cleanSheetsActuelles && cleanSheetsPrecedentes) {
  const actuelles = Number(cleanSheetsActuelles);
  const precedentes = Number(cleanSheetsPrecedentes);
  const hausse = actuelles >= precedentes;
  const clsClass = hausse ? 'up' : 'down';
  const cleanSheetsHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>${STYLE}</style></head>
<body>
<div class="eyebrow">Défenses</div>
<h1>Et derrière, ça <span>${hausse ? 'progresse' : 'recule'}</span> aussi</h1>
<div class="stats-duo">
  <div class="stat-box"><div class="val ${clsClass}">${actuelles}</div><div class="lbl">Clean sheets cette journée</div></div>
  <div class="stat-box"><div class="val">${precedentes}</div><div class="lbl">La semaine dernière</div></div>
</div>
<div class="cta">Suis les stats en direct sur <b>footlight.fr</b></div>
</body></html>`;
  console.log('Affichage de la scène clean sheets...');
  await page.setContent(cleanSheetsHtml);
  await page.waitForTimeout(4200);
}

await context.close();
await browser.close();
server.close();

const fichiers = await readdir(outDir);
const video = fichiers.find((f) => f.endsWith('.webm'));
console.log(`Vidéo générée : ${video ? path.join(outDir, video) : '(aucune trouvée)'}`);
