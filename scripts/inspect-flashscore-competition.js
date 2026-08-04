// Vérifie, via un vrai navigateur, quel libellé de compétition flashscore.fr
// affiche pour un club donné (breadcrumb / lien championnat / titre), pour
// comparer avec le nom "Ligue 3" utilisé sur lequipe.fr et lever le doute
// sur une éventuelle confusion avec "National".
import { chromium } from 'playwright';

const targetUrl = process.env.TARGET_URL;
if (!targetUrl) {
  console.error('TARGET_URL manquant.');
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 60000 });

console.log(`Titre de la page : "${await page.title()}"`);

const result = await page.evaluate(() => {
  // Liens de breadcrumb (généralement Football > Pays > Compétition > Club).
  const breadcrumbLinks = [...document.querySelectorAll('a[href*="/football/"]')]
    .map((a) => ({ text: a.textContent.trim(), href: a.getAttribute('href') }))
    .filter((l) => l.text);

  // Tout élément dont le texte visible ressemble à un nom de championnat
  // (contient "National" ou "Ligue" en toutes lettres, hors menus génériques).
  const candidats = [...document.querySelectorAll('body *')]
    .filter((el) => el.children.length === 0)
    .map((el) => el.textContent.trim())
    .filter((t) => t && t.length < 60 && /national|ligue\s*3/i.test(t));
  const candidatsUniques = [...new Set(candidats)];

  // Contexte détaillé (ancêtres + éléments voisins) pour chaque occurrence
  // de "National" — pour savoir si c'est l'étiquette réellement affichée
  // pour CE club, ou juste un lien de menu générique vers une autre page.
  const contexts = [...document.querySelectorAll('body *')]
    .filter((el) => el.children.length === 0)
    .filter((el) => /national/i.test(el.textContent.trim()) && el.textContent.trim().length < 60)
    .map((el) => {
      let chain = [];
      let cur = el;
      for (let i = 0; i < 5 && cur; i++) {
        chain.push(`<${cur.tagName.toLowerCase()} class="${cur.className || ''}">`);
        cur = cur.parentElement;
      }
      return {
        text: el.textContent.trim(),
        tag: el.tagName,
        href: el.closest('a')?.getAttribute('href') || null,
        ancestorChain: chain.join(' < '),
      };
    });

  return { breadcrumbLinks: breadcrumbLinks.slice(0, 20), candidatsUniques: candidatsUniques.slice(0, 20), contexts };
});

console.log('\n=== Liens de breadcrumb (football) ===');
result.breadcrumbLinks.forEach((l) => console.log(` - "${l.text}" -> ${l.href}`));

console.log('\n=== Textes courts contenant "National" ou "Ligue 3" ===');
result.candidatsUniques.forEach((t) => console.log(` - "${t}"`));

console.log('\n=== Contexte détaillé de chaque occurrence de "National" ===');
result.contexts.forEach((c) => {
  console.log(`\n--- "${c.text}" (lien: ${c.href || 'aucun'}) ---`);
  console.log(c.ancestorChain);
});

await browser.close();
