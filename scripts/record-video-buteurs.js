// Enregistre une vidéo verticale (réseaux sociaux, format Reel) façon
// "story" : cadre doré, barre de progression segmentée en haut, une carte
// par joueur générée côté client (jamais de scroll du vrai site, qui rend
// mal en format vertical). Même esprit visuel que les anciennes vidéos
// "alerte recrutement" (fond noir, typo Anton, accent doré), avec en plus
// le cadre/barre de progression et un bouton CTA repris d'une maquette de
// référence.
//
// Lecture seule : une seule requête Supabase (SELECT) via la clé anon
// publique déjà utilisée par l'appli, aucune écriture. Pour chaque joueur,
// va chercher son dernier match synchronisé (matchs_joueur) pour afficher
// un accroche automatique ("triplé", "doublé", "toujours à 0"...) à partir
// de ses vraies stats.
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const outDir = process.env.OUT_DIR || path.join(repoRoot, 'demo-video-buteurs-out');

const SUPABASE_URL = 'https://migarohddystlyhuoxfg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pZ2Fyb2hkZHlzdGx5aHVveGZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MjI2NjksImV4cCI6MjA5Mjk5ODY2OX0.NKlySSVpnws5WZF41T2qeoMjBi5VZzpnk_h-ejTj9R4';
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const noms = (process.env.NOMS || '').split(',').map((s) => s.trim()).filter(Boolean);
const titre = process.env.TITRE || 'Qui va';
const titreAccent = process.env.TITRE_ACCENT || 'confirmer ?';
const sousTitre = process.env.SOUS_TITRE || 'Après une journée 1 explosive, ces attaquants sont attendus ce soir.';
const clotureTitre = process.env.CLOTURE_TITRE || 'Suis la';
const clotureAccent = process.env.CLOTURE_ACCENT || 'journée 2';
const clotureSousTitre = process.env.CLOTURE_SOUS_TITRE || "Stats vérifiées FFF, mises à jour chaque jour sur footlight.fr";

if (!noms.length) { console.error('NOMS manquant (liste "Prénom Nom" séparés par des virgules).'); process.exit(1); }

function normalizeName(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}
const POSTE_DISPLAY = {
  gardien: 'Gardien', defenseur_central: 'Défenseur central',
  lateral_droit: 'Latéral droit', lateral_gauche: 'Latéral gauche',
  piston_droit: 'Piston droit', piston_gauche: 'Piston gauche',
  milieu_central: 'Milieu central', milieu_offensif: 'Milieu offensif', milieu_defensif: 'Milieu défensif',
  ailier_droit: 'Ailier droit', ailier_gauche: 'Ailier gauche', attaquant: 'Attaquant',
};

console.log('Résolution des joueurs (lecture seule)...');
const { data: allJoueurs, error: jErr } = await db.from('joueurs').select('id,prenom,nom,poste,club');
if (jErr) { console.error('Erreur lecture joueurs :', jErr.message); process.exit(1); }

const profils = [];
for (const nomComplet of noms) {
  const [prenom, ...reste] = nomComplet.split(' ');
  const nom = reste.join(' ');
  const np = normalizeName(prenom), nn = normalizeName(nom);
  const j = (allJoueurs || []).find((x) => normalizeName(x.prenom) === np && normalizeName(x.nom) === nn);
  if (!j) { console.log(`Introuvable, ignoré : "${nomComplet}"`); continue; }

  const { data: matchs } = await db.from('matchs_joueur').select('date_match,adversaire,buts,minutes_jouees')
    .eq('joueur_id', j.id).not('minutes_jouees', 'is', null).order('date_match', { ascending: false }).limit(1);
  const dernier = matchs && matchs[0];

  let eyebrow = '👀 En attente de son premier match';
  if (dernier) {
    const buts = dernier.buts || 0;
    if (buts >= 3) eyebrow = `⚽ Triplé face à ${dernier.adversaire}`;
    else if (buts === 2) eyebrow = `⚽ Doublé face à ${dernier.adversaire}`;
    else if (buts === 1) eyebrow = `⚽ But face à ${dernier.adversaire}`;
    else eyebrow = `👀 Toujours à 0 (${dernier.minutes_jouees} min face à ${dernier.adversaire})`;
  }

  console.log(`Trouvé : ${j.prenom} ${j.nom} (${j.club}) — ${eyebrow}`);
  profils.push({
    prenom: j.prenom, nom: j.nom, poste: POSTE_DISPLAY[j.poste] || j.poste, club: j.club, eyebrow,
    stat: dernier ? { val: String(dernier.buts || 0), unit: dernier.buts ? 'but(s) en j1' : 'but en j1' } : null,
  });
}
if (!profils.length) { console.error('Aucun des noms fournis n\'a été trouvé.'); process.exit(1); }

// ---- Enregistrement vidéo (format vertical, façon story) ----
await mkdir(outDir, { recursive: true });
const browser = await chromium.launch(process.env.PW_EXECUTABLE_PATH ? { executablePath: process.env.PW_EXECUTABLE_PATH } : {});
const VIEWPORT = { width: 720, height: 1280 };
const context = await browser.newContext({ viewport: VIEWPORT, recordVideo: { dir: outDir, size: VIEWPORT } });
const page = await context.newPage();

const TOTAL_SLIDES = profils.length + 2; // carte de titre + une par joueur + carte de clôture
const SLIDE_MS = 3200;

function progressBarHtml(index) {
  let segs = '';
  for (let i = 0; i < TOTAL_SLIDES; i++) {
    if (i < index) segs += `<div class="seg"><div class="fill done"></div></div>`;
    else if (i === index) segs += `<div class="seg"><div class="fill active"></div></div>`;
    else segs += `<div class="seg"><div class="fill"></div></div>`;
  }
  return `<div class="progress-wrap">${segs}</div>`;
}

const BASE_STYLE = `
@import url('https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;600;700&display=swap');
* { margin:0; padding:0; box-sizing:border-box; }
body {
  background:#07090e; min-height:100vh; display:flex; flex-direction:column;
  align-items:center; justify-content:center; position:relative;
  font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  padding:0 56px; text-align:center;
}
.corner { position:fixed; width:34px; height:34px; border-color:#e3b341; border-radius:6px; }
.corner-tl { top:14px; left:14px; border-top:4px solid; border-left:4px solid; }
.corner-tr { top:14px; right:14px; border-top:4px solid; border-right:4px solid; }
.corner-bl { bottom:14px; left:14px; border-bottom:4px solid; border-left:4px solid; }
.corner-br { bottom:14px; right:14px; border-bottom:4px solid; border-right:4px solid; }
.progress-wrap { position:fixed; top:26px; left:52px; right:52px; display:flex; gap:8px; }
.seg { flex:1; height:3px; background:#2a2f3a; border-radius:2px; overflow:hidden; }
.fill { height:100%; width:0%; background:#e3b341; }
.fill.done { width:100%; }
.fill.active { animation: fillseg ${SLIDE_MS}ms linear forwards; }
@keyframes fillseg { from{width:0%} to{width:100%} }
.eyebrow {
  font-size:0.85rem; font-weight:700; letter-spacing:0.18em; text-transform:uppercase;
  color:#8b93a8; margin-bottom:18px;
}
h1 {
  font-family:'Anton',sans-serif; font-weight:400; text-transform:uppercase;
  font-size:3.2rem; line-height:1.05; color:#f2ede4; letter-spacing:0.01em;
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
.cta {
  margin-top:26px; border:1.5px solid #2a2f3a; border-radius:8px; padding:16px 28px;
  font-size:0.78rem; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#c8cedb;
}
`;

function shellHtml(index, body) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>${BASE_STYLE}</style></head>
<body>
<div class="corner corner-tl"></div><div class="corner corner-tr"></div>
<div class="corner corner-bl"></div><div class="corner corner-br"></div>
${progressBarHtml(index)}
${body}
</body></html>`;
}

function titleCardHtml(index, { eyebrow, title, titleAccent: accent, subtitle }) {
  return shellHtml(index, `
<div class="eyebrow">${eyebrow}</div>
<h1>${title} <span class="accent">${accent}</span></h1>
<p class="subtitle">${subtitle}</p>`);
}

function playerCardHtml(index, { prenom, nom, poste, club, eyebrow, stat }) {
  return shellHtml(index, `
<div class="eyebrow">${eyebrow}</div>
<h1>${prenom} <span class="accent">${nom}</span></h1>
<p class="subtitle">${poste} · ${club}</p>
${stat ? `<div class="box"><div class="val">${stat.val}</div><div class="unit">${stat.unit}</div></div>` : ''}
<div class="cta">Profil complet sur footlight</div>`);
}

let idx = 0;
console.log('Affichage de la carte de titre...');
await page.setContent(titleCardHtml(idx, { eyebrow: 'Ligue 3 · Ce soir', title: titre, titleAccent: titreAccent, subtitle: sousTitre }));
await page.waitForTimeout(SLIDE_MS);
idx++;

for (const profil of profils) {
  console.log(`Affichage de la carte de ${profil.prenom} ${profil.nom}...`);
  await page.setContent(playerCardHtml(idx, profil));
  await page.waitForTimeout(SLIDE_MS);
  idx++;
}

console.log('Affichage de la carte de clôture...');
await page.setContent(titleCardHtml(idx, { eyebrow: 'FootLight', title: clotureTitre, titleAccent: clotureAccent, subtitle: clotureSousTitre }));
await page.waitForTimeout(SLIDE_MS);

await context.close();
await browser.close();

const fichiers = await readdir(outDir);
const video = fichiers.find((f) => f.endsWith('.webm'));
console.log(`Vidéo générée : ${video ? path.join(outDir, video) : '(aucune trouvée)'}`);
