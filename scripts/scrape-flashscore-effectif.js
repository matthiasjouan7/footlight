// Extraction (lecture seule) de l'effectif d'un club sur flashscore.fr, via
// un vrai navigateur (page SPA React, voir inspect-flashscore.js /
// inspect-flashscore-browser.js). Structure DOM stable identifiée :
// div.lineupTable--soccer (un par poste) > div.lineupTable__row (un par
// joueur) > div.lineupTable__cell--<champ>.
import { chromium } from 'playwright';

const targetUrl = process.env.TARGET_URL;
if (!targetUrl) {
  console.error('TARGET_URL manquant.');
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 60000 });

const effectif = await page.evaluate(() => {
  const num = (el) => {
    if (!el) return null;
    const t = el.textContent.trim();
    return t === '' ? null : parseInt(t, 10);
  };

  const groupes = [...document.querySelectorAll('.lineupTable--soccer')];
  return groupes.map((groupe) => {
    const poste = groupe.querySelector('.lineupTable__title')?.textContent.trim() || null;
    const rows = [...groupe.querySelectorAll('.lineupTable__row')];
    const joueurs = rows.map((row) => {
      const nameEl = row.querySelector('.lineupTable__cell--name');
      const flagEl = row.querySelector('.lineupTable__cell--flag');
      // Tout élément supplémentaire dans "nameAndAbsence" en dehors du lien
      // nom (ex: icône blessure/suspension) — capturé génériquement.
      const absenceContainer = row.querySelector('.lineupTable__cell--nameAndAbsence');
      let absence = null;
      if (absenceContainer) {
        const extra = [...absenceContainer.children].find((c) => !c.matches('.lineupTable__cell--name'));
        if (extra) {
          absence = {
            title: extra.getAttribute('title') || extra.querySelector('[title]')?.getAttribute('title') || null,
            html: extra.outerHTML.slice(0, 300),
          };
        }
      }
      return {
        numero: num(row.querySelector('.lineupTable__cell--jersey')),
        nom: nameEl?.textContent.trim() || null,
        lien_fiche: nameEl?.getAttribute('href') || null,
        nationalite: flagEl?.getAttribute('title') || null,
        age: num(row.querySelector('.lineupTable__cell--age')),
        matchs_joues: num(row.querySelector('.lineupTable__cell--matchesPlayed')),
        minutes: num(row.querySelector('.lineupTable__cell--minutesPlayed')),
        buts: num(row.querySelector('.lineupTable__cell--goal')),
        passes_decisives: num(row.querySelector('.lineupTable__cell--assist')),
        cartons_jaunes: num(row.querySelector('.lineupTable__cell--yellowCard')),
        cartons_rouges: num(row.querySelector('.lineupTable__cell--redCard')),
        absence,
      };
    });
    // flashscore rend parfois la même ligne deux fois dans le DOM (une
    // visible, une cachée) : on déduplique par lien de fiche joueur.
    const joueursUniques = [...new Map(joueurs.map((j) => [j.lien_fiche || j.nom, j])).values()];
    return { poste, joueurs: joueursUniques };
  });
});

await browser.close();

console.log(JSON.stringify({ source_url: targetUrl, effectif }, null, 2));
const total = effectif.reduce((n, g) => n + g.joueurs.length, 0);
console.log(`\n${effectif.length} groupe(s) de poste, ${total} joueur(s) au total.`);
