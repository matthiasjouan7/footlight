// Diagnostic lecture seule : les 2 diagnostics précédents ont montré que le
// HTML brut (fetch simple, sans JS) d'une page journée lequipe.fr n'expose
// AUCUN lien propre par match pour 7 des 8 rencontres — seul le match "en
// direct" a un lien, injecté ailleurs sur la page. Vérifie si un rendu JS
// complet (Playwright/Chromium) fait apparaître les vrais liens
// match-direct individuels pour chaque rencontre.
import { chromium } from 'playwright';

const targetUrl = process.env.TARGET_URL
  || 'https://www.lequipe.fr/Football/national-1-groupe-c/page-calendrier-resultats/2e-journee';

const browser = await chromium.launch();
const page = await browser.newPage({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  locale: 'fr-FR',
});
await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1500);
console.log(`Page : "${await page.title()}"`);

const infos = await page.evaluate(() => {
  const teamScores = [...document.querySelectorAll('.TeamScore')];
  const resultats = teamScores.map((el) => {
    const home = el.querySelector('.TeamScore__team--home')?.textContent.trim() || '?';
    const awayEl = [...el.querySelectorAll('.TeamScore__team')].find((t) => !t.classList.contains('TeamScore__team--home'));
    const away = awayEl?.textContent.trim() || '?';
    let node = el, href = null, depth = 0;
    while (node && depth < 8 && !href) {
      node = node.parentElement;
      depth++;
      if (node && node.tagName === 'A' && node.href) href = node.href;
    }
    return { home, away, href };
  });
  const tousLiensMatchDirect = [...new Set([...document.querySelectorAll('a[href*="match-direct"]')].map((a) => a.href))];
  return { resultats, tousLiensMatchDirect };
});

console.log(`\n${infos.resultats.length} match(s) après rendu JS :`);
for (const r of infos.resultats) console.log(`  "${r.home}" vs "${r.away}" -> ${r.href || '(aucun lien ancêtre)'}`);

console.log(`\n${infos.tousLiensMatchDirect.length} lien(s) match-direct unique(s) sur la page après rendu JS :`);
infos.tousLiensMatchDirect.forEach((h) => console.log(`  ${h}`));

await browser.close();
