// Diagnostic lecture seule : la page classement-passeurs National 2 de
// foot-direct.com existe-t-elle sous une URL combinée (comme National 1,
// /france/national-2/classement-passeurs) ou faut-il une page par groupe
// (comme lequipe.fr pour le calendrier) ? Dump le statut HTTP et la
// structure de la page pour le savoir avant de câbler le cron.
import * as cheerio from 'cheerio';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'fr-FR,fr;q=0.9',
};

const urlsATester = [
  'https://www.foot-direct.com/france/national-2/classement-passeurs',
  'https://www.foot-direct.com/france/national-2-groupe-a/classement-passeurs',
];

for (const url of urlsATester) {
  console.log(`\n=== ${url} ===`);
  const res = await fetch(url, { headers: HEADERS });
  console.log(`Statut : ${res.status}`);
  if (!res.ok) continue;
  const html = await res.text();
  console.log(`Taille HTML : ${html.length} caractères`);
  const $ = cheerio.load(html);
  console.log(`Nombre de <table> : ${$('table').length}`);
  console.log(`Nombre de <tr> : ${$('tr').length}`);
  const bodyTxt = $('body').text().replace(/\s+/g, ' ').trim();
  console.log(`Titre <title> : ${$('title').text().trim()}`);
  console.log(`Aperçu body (500 premiers caractères) : ${bodyTxt.slice(0, 500)}`);
  if (/aucune stat disponible/i.test(bodyTxt)) console.log('-> "Aucune stat disponible" détecté.');
}
