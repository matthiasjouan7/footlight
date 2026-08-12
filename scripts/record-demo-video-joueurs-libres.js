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
import { mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const outDir = process.env.OUT_DIR || path.join(repoRoot, 'demo-video-joueurs-libres-out');

const SUPABASE_URL = 'https://migarohddystlyhuoxfg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pZ2Fyb2hkZHlzdGx5aHVveGZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MjI2NjksImV4cCI6MjA5Mjk5ODY2OX0.NKlySSVpnws5WZF41T2qeoMjBi5VZzpnk_h-ejTj9R4';
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

const POSTE_DISPLAY = {
  gardien: 'Gardien', defenseur_central: 'Défenseur',
  lateral_droit: 'Latéral', lateral_gauche: 'Latéral',
  piston_droit: 'Latéral', piston_gauche: 'Latéral',
  milieu_central: 'Milieu', milieu_offensif: 'Milieu', milieu_defensif: 'Milieu',
  ailier_droit: 'Attaquant', ailier_gauche: 'Attaquant', attaquant: 'Attaquant', autre: 'Milieu',
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

const BASE_STYLE = `
@import url('https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;600;700&display=swap');
* { margin:0; padding:0; box-sizing:border-box; }
body {
  background:#07090e; min-height:100vh; display:flex; flex-direction:column;
  align-items:center; justify-content:center;
  font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  padding:0 56px; text-align:center;
}
.eyebrow {
  font-size:0.85rem; font-weight:700; letter-spacing:0.18em; text-transform:uppercase;
  color:#8b93a8; margin-bottom:18px;
}
h1 {
  font-family:'Anton',sans-serif; font-weight:400; text-transform:uppercase;
  font-size:3.4rem; line-height:1.02; color:#f2ede4; letter-spacing:0.01em;
  margin-bottom:20px; max-width:600px;
}
h1 .accent { color:#e3b341; }
p.subtitle { font-size:1.05rem; font-weight:400; color:#8b93a8; line-height:1.5; max-width:460px; }
.box {
  margin-top:30px; border:1.5px solid #2a2f3a; border-radius:8px;
  padding:18px 34px; display:inline-flex; flex-direction:column; align-items:center; gap:4px;
}
.box .val { font-family:'Anton',sans-serif; font-size:2.6rem; color:#e3b341; line-height:1; }
.box .unit { font-size:0.7rem; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#8b93a8; }
`;

function titleCardHtml({ eyebrow, title, titleAccent, subtitle }) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>${BASE_STYLE}</style></head>
<body>
<div class="eyebrow">${eyebrow}</div>
<h1>${title} <span class="accent">${titleAccent}</span></h1>
<p class="subtitle">${subtitle}</p>
</body></html>`;
}

function playerCardHtml({ prenom, nom, poste, stat, badge }) {
  const posteLabel = poste ? (POSTE_DISPLAY[poste] || 'Milieu') : 'Poste à définir';
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>${BASE_STYLE}</style></head>
<body>
<div class="eyebrow">🔓 Libre — sans club</div>
<h1>${prenom} <span class="accent">${nom}</span></h1>
<p class="subtitle">${posteLabel} · recherche un club dès maintenant${badge ? ` · profil ${badge.toLowerCase()}` : ''}</p>
${stat ? `<div class="box"><div class="val">${stat.val}</div><div class="unit">${stat.unit}</div></div>` : ''}
</body></html>`;
}

console.log('Affichage de la carte de titre...');
await page.setContent(titleCardHtml({
  eyebrow: 'Recrutement',
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
  eyebrow: 'FootLight',
  title: 'Recrute',
  titleAccent: 'maintenant',
  subtitle: 'Retrouve ces joueurs et bien d\'autres sur footlight.fr',
}));
await page.waitForTimeout(3200);

await context.close();
await browser.close();

const fichiers = await readdir(outDir);
const video = fichiers.find((f) => f.endsWith('.webm'));
console.log(`Vidéo générée : ${video ? path.join(outDir, video) : '(aucune trouvée)'}`);
