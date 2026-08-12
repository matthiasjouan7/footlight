// Enregistre une courte vidéo verticale (réseaux sociaux) « alerte
// recrutement » mettant en avant 4 joueurs libres (sans club), dans le
// même esprit visuel que les cartes podium du classement (top attaquant,
// clean sheets...) : une carte "spotlight" par joueur, générée côté
// client, avec ses vraies stats si son profil existe en base.
//
// Lecture seule : une seule requête Supabase (SELECT) via la clé anon
// publique déjà utilisée par l'appli (footlight-classement.html), aucune
// écriture. Le club affiché est toujours "Libre — recherche un club",
// quel que soit le club renseigné en base, à la demande de l'utilisateur.
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { readFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const outDir = process.env.OUT_DIR || path.join(repoRoot, 'demo-video-joueurs-libres-out');

const SUPABASE_URL = 'https://migarohddystlyhuoxfg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pZ2Fyb2hkZHlzdGx5aHVveGZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MjI2NjksImV4cCI6MjA5Mjk5ODY2OX0.NKlySSVpnws5WZF41T2qeoMjBi5VZzpnk_h-ejTj9R4';
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const logoBase64 = await readFile(path.join(repoRoot, 'icons', 'icon-192.png')).then((b) => b.toString('base64'));

const JOUEURS = [
  { prenom: 'Yves', nom: 'DjeDje' },
  { prenom: 'Luderic', nom: 'Etonde' },
  { prenom: 'Salim', nom: 'Jabi' },
  { prenom: 'Adama', nom: 'Diop' },
];

function normalizeName(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}
function n(v) { return v || 0; }
function initials(prenom, nom) { return ((prenom || '?')[0] + (nom || '?')[0]).toUpperCase(); }

const POSTE_DISPLAY = {
  gardien: 'Gardien', defenseur_central: 'Défenseur',
  lateral_droit: 'Latéral', lateral_gauche: 'Latéral',
  piston_droit: 'Latéral', piston_gauche: 'Latéral',
  milieu_central: 'Milieu', milieu_offensif: 'Milieu', milieu_defensif: 'Milieu',
  ailier_droit: 'Attaquant', ailier_gauche: 'Attaquant', attaquant: 'Attaquant', autre: 'Milieu',
};
const COULEURS = {
  gardien: '#1f6feb', defenseur_central: '#da3633',
  lateral_droit: '#8957e5', lateral_gauche: '#8957e5',
  piston_droit: '#8957e5', piston_gauche: '#8957e5',
  milieu_central: '#238636', milieu_offensif: '#238636', milieu_defensif: '#238636',
  ailier_droit: '#d29922', ailier_gauche: '#d29922', attaquant: '#d29922', autre: '#6e7681',
};
const BADGE_LABEL = { declaratif: 'Déclaratif', video: 'Vidéo', gps: 'GPS', elite: 'Elite' };

function statFor(j) {
  if (!j || !j.matchs_joues) return null;
  if (j.poste === 'gardien') {
    return { val: (n(j.buts_encaisses_avec) / j.matchs_joues).toFixed(2), unit: 'buts encaissés / match' };
  }
  return { val: ((n(j.buts) + n(j.passes_decisives)) / j.matchs_joues).toFixed(2), unit: 'buts + passes / match' };
}

console.log('Recherche des 4 profils en base (lecture seule)...');
const { data: allJoueurs, error } = await db.from('joueurs')
  .select('prenom,nom,poste,badge,buts,passes_decisives,matchs_joues,buts_encaisses_avec');
if (error) { console.error('Erreur lecture joueurs :', error.message); process.exit(1); }

function trouverJoueur(prenom, nom) {
  const np = normalizeName(prenom), nn = normalizeName(nom);
  return (allJoueurs || []).find((j) => normalizeName(j.prenom) === np && normalizeName(j.nom) === nn);
}

const profils = JOUEURS.map(({ prenom, nom }) => {
  const j = trouverJoueur(prenom, nom);
  if (j) console.log(`Trouvé : ${prenom} ${nom} — poste=${j.poste}, ${j.matchs_joues} match(s)`);
  else console.log(`Introuvable : ${prenom} ${nom} — carte sans stats.`);
  return { prenom, nom, poste: j ? j.poste : null, badge: j ? BADGE_LABEL[j.badge] : null, stat: statFor(j) };
});

// ---- Enregistrement vidéo (format vertical, réseaux sociaux) ----
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
.logo-img { position:relative; width:76px; height:76px; border-radius:20px;
  margin-bottom:28px; box-shadow:0 10px 32px rgba(79,142,247,0.25);
}
.emoji { position:relative; font-size:3rem; margin-bottom:16px; }
h1 { position:relative; font-size:2.6rem; font-weight:800; text-align:center; color:#f0f2f7;
  letter-spacing:-1px; line-height:1.15; margin-bottom:16px; max-width:560px; }
h1 span { background:linear-gradient(90deg,#4f8ef7,#7c6af7); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
p { position:relative; font-size:1rem; color:#8b93a8; text-align:center; max-width:480px; line-height:1.6; }
</style></head>
<body>
<div class="bg-mesh"></div>
<img class="logo-img" src="data:image/png;base64,${logoBase64}" alt="FootLight"/>
<div class="emoji">${emoji}</div>
<h1>${title} <span>${titleAccent}</span></h1>
<p>${subtitle}</p>
</body></html>`;
}

function playerCardHtml({ prenom, nom, poste, stat, badge }) {
  const couleur = poste ? (COULEURS[poste] || '#6e7681') : '#6e7681';
  const posteLabel = poste ? (POSTE_DISPLAY[poste] || 'Milieu') : 'Poste à définir';
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
* { margin:0; padding:0; box-sizing:border-box; }
body {
  background:#07090e; min-height:100vh; display:flex; flex-direction:column;
  align-items:center; justify-content:center;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  position:relative; overflow:hidden; padding:0 30px;
}
.bg-mesh { position:absolute; inset:0;
  background:
    radial-gradient(ellipse 60% 50% at 15% 20%, rgba(210,153,34,0.10) 0%, transparent 60%),
    radial-gradient(ellipse 50% 40% at 85% 80%, rgba(79,142,247,0.08) 0%, transparent 60%);
}
.logo-img { position:relative; width:56px; height:56px; border-radius:16px; margin-bottom:24px; }
.card {
  position:relative; width:100%; max-width:460px;
  background:linear-gradient(180deg,rgba(210,153,34,0.10) 0%,#161b22 55%);
  border:1px solid #d29922; border-radius:22px;
  padding:34px 26px 30px; text-align:center;
  display:flex; flex-direction:column; align-items:center; gap:12px;
  box-shadow:0 0 0 1px rgba(210,153,34,0.2), 0 18px 40px -18px rgba(210,153,34,0.35);
}
.free-badge {
  background:rgba(210,153,34,0.13); border:1px solid #d29922; color:#e3b341;
  font-size:0.8rem; font-weight:800; letter-spacing:0.03em;
  padding:6px 16px; border-radius:20px; margin-bottom:6px;
}
.avatar {
  width:92px; height:92px; border-radius:50%;
  display:flex; align-items:center; justify-content:center;
  font-weight:800; font-size:1.8rem; color:#fff;
  background:linear-gradient(135deg,${couleur},${couleur}88);
}
.name { font-weight:800; font-size:1.55rem; color:#f0f2f7; }
.meta { font-size:0.92rem; color:#8b93a8; }
.meta b { color:#e3b341; }
.stat-val { font-size:2.5rem; font-weight:800; color:#e3b341; line-height:1; margin-top:8px; }
.stat-unit { font-size:0.72rem; color:#8b93a8; text-transform:uppercase; letter-spacing:0.05em; }
.placeholder { font-size:0.85rem; color:#8b93a8; margin-top:10px; max-width:320px; }
.badge-chip {
  font-size:0.7rem; font-weight:700; letter-spacing:0.03em;
  padding:4px 12px; border-radius:20px; border:1px solid #30363d; color:#8b949e; margin-top:6px;
}
</style></head>
<body>
<div class="bg-mesh"></div>
<img class="logo-img" src="data:image/png;base64,${logoBase64}" alt="FootLight"/>
<div class="card">
  <div class="free-badge">🔓 LIBRE — SANS CLUB</div>
  <div class="avatar">${initials(prenom, nom)}</div>
  <div class="name">${prenom} ${nom}</div>
  <div class="meta">${posteLabel} · <b>Recherche un club</b></div>
  ${stat ? `<div class="stat-val">${stat.val}</div><div class="stat-unit">${stat.unit}</div>` : `<div class="placeholder">Profil complet bientôt disponible sur FootLight</div>`}
  ${badge ? `<div class="badge-chip">${badge}</div>` : ''}
</div>
</body></html>`;
}

console.log('Affichage de la carte de titre...');
await page.setContent(titleCardHtml({
  emoji: '🔔',
  title: 'Alerte',
  titleAccent: 'recrutement',
  subtitle: '4 joueurs libres, prêts à s\'engager dès maintenant. Recruteurs, à vous de jouer.',
}));
await page.waitForTimeout(3200);

for (const profil of profils) {
  console.log(`Affichage de la carte de ${profil.prenom} ${profil.nom}...`);
  await page.setContent(playerCardHtml(profil));
  await page.waitForTimeout(3200);
}

console.log('Affichage de la carte de clôture...');
await page.setContent(titleCardHtml({
  emoji: '📣',
  title: 'Recrute',
  titleAccent: 'sur FootLight',
  subtitle: 'Retrouve ces joueurs et bien d\'autres — footlight.fr',
}));
await page.waitForTimeout(3200);

await context.close();
await browser.close();

const fichiers = await readdir(outDir);
const video = fichiers.find((f) => f.endsWith('.webm'));
console.log(`Vidéo générée : ${video ? path.join(outDir, video) : '(aucune trouvée)'}`);
