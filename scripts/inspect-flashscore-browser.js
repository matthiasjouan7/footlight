// Inspection (lecture seule) d'une page effectif flashscore.fr via un vrai
// navigateur (la page est une SPA React, rien d'exploitable en HTML brut —
// voir inspect-flashscore.js). Sert à identifier la structure DOM réelle
// (classes/attributs) avant d'écrire un extracteur précis.
import { chromium } from 'playwright';

const targetUrl = process.env.TARGET_URL;
if (!targetUrl) {
  console.error('TARGET_URL manquant.');
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 60000 });

// Cherche un titre de poste ("Défenseurs", "Milieux", "Attaquants",
// "Gardiens") pour localiser la zone d'effectif, puis remonte à un ancêtre
// commun raisonnable et dump sa structure.
const result = await page.evaluate(() => {
  function textNodesMatching(root, re) {
    const found = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    let node = walker.currentNode;
    while (node) {
      const ownText = [...node.childNodes]
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent.trim())
        .join('');
      if (re.test(ownText) && ownText.length < 30) found.push(node);
      node = walker.nextNode();
    }
    return found;
  }

  const headings = textNodesMatching(document.body, /^(Gardiens|Défenseurs|Milieux|Attaquants)$/);
  const headingInfo = headings.map((el) => ({
    text: el.textContent.trim(),
    tag: el.tagName,
    class: el.className,
    parentClass: el.parentElement?.className || null,
  }));

  // Pour le premier titre trouvé, remonte de quelques niveaux et capture le
  // outerHTML (tronqué) pour voir la structure des lignes de joueurs.
  let sampleHtml = null;
  let sampleAncestorClass = null;
  if (headings.length) {
    let el = headings[0];
    for (let i = 0; i < 4 && el.parentElement; i++) el = el.parentElement;
    sampleAncestorClass = el.className;
    sampleHtml = el.outerHTML.slice(0, 4000);
  }

  return { headingsFound: headingInfo, sampleAncestorClass, sampleHtml };
});

console.log(`Titres de poste trouvés : ${result.headingsFound.length}`);
result.headingsFound.forEach((h) => console.log(` - "${h.text}" <${h.tag} class="${h.class}"> (parent class: "${h.parentClass}")`));

console.log(`\n=== Ancêtre du 1er titre (classe: "${result.sampleAncestorClass}") ===`);
console.log(result.sampleHtml);

await browser.close();
