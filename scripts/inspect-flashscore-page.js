// Diagnostic (lecture seule) : le sélecteur .lineupTable--soccer, qui
// fonctionnait auparavant (ex: Caen), ne matche plus rien sur certains
// clubs (Dieppe, Montlouis) même après rechargement. Ce script dumpe l'état
// réel de la page (bannière cookies éventuelle, classes présentes, texte
// visible) pour comprendre ce qui bloque le rendu du widget d'effectif.
import { chromium } from 'playwright';

const targetUrl = process.env.TARGET_URL;
if (!targetUrl) { console.error('TARGET_URL manquant.'); process.exit(1); }

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(3000);

const rapport = await page.evaluate(() => {
  const compte = (sel) => document.querySelectorAll(sel).length;
  const candidatsClasses = new Set();
  document.querySelectorAll('[class]').forEach((el) => {
    el.classList.forEach((c) => {
      if (/lineup|squad|roster|player|effectif|team/i.test(c)) candidatsClasses.add(c);
    });
  });
  const bannieres = ['#onetrust-banner-sdk', '.fc-consent-root', '.cmpbox', '.cookie', '[id*=consent]', '[class*=consent]', '[class*=cookie]']
    .map((sel) => ({ sel, present: !!document.querySelector(sel), visible: (() => { const el = document.querySelector(sel); return el ? el.offsetParent !== null : false; })() }))
    .filter((b) => b.present);
  const onglets = [...document.querySelectorAll('a[href*="/equipe/"]')]
    .map((a) => ({ text: a.textContent.trim(), href: a.getAttribute('href') }))
    .filter((l) => l.text && /^[A-ZÀ-Ü]/.test(l.text) && l.text.length < 30);
  return {
    title: document.title,
    url: location.href,
    lineupTableSoccer: compte('.lineupTable--soccer'),
    lineupTableAny: compte('[class*=lineupTable]'),
    bodyTextStart: document.body.innerText.slice(0, 2000),
    classesCandidates: [...candidatsClasses],
    bannieresCookies: bannieres,
    iframeCount: compte('iframe'),
    iframeSrcs: [...document.querySelectorAll('iframe')].map((f) => f.getAttribute('src')).filter(Boolean).slice(0, 10),
    onglets,
  };
});

console.log(`Titre : "${rapport.title}"`);
console.log(`URL finale : ${rapport.url}`);
console.log(`.lineupTable--soccer : ${rapport.lineupTableSoccer} élément(s)`);
console.log(`[class*=lineupTable] : ${rapport.lineupTableAny} élément(s)`);
console.log(`Classes candidates (lineup/squad/roster/player/effectif/team) trouvées : ${rapport.classesCandidates.join(', ') || '(aucune)'}`);
console.log(`Bannières cookies/consent détectées : ${JSON.stringify(rapport.bannieresCookies)}`);
console.log(`Iframes : ${rapport.iframeCount} (${rapport.iframeSrcs.join(', ')})`);
console.log(`\nOnglets/liens détectés vers /equipe/ (${rapport.onglets.length}) :`);
rapport.onglets.forEach((o) => console.log(` - "${o.text}" -> ${o.href}`));
console.log(`\n--- Texte visible du body (2000 premiers caractères) ---\n${rapport.bodyTextStart}`);

await browser.close();
