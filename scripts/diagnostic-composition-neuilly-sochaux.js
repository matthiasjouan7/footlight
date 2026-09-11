// Diagnostic lecture seule : pourquoi le match Neuilly vs Sochaux du
// 2026-09-05 (calendrier_officiel_id=1225, National 2 groupe E) reste à
// 0/43 lignes matchs_joueur avec minutes malgré le correctif du crash de
// sync-transfermarkt-match-stats-n2.js (PR #958). Récupère la page
// Transfermarkt de CE match précis et affiche les tables de composition
// brutes, pour voir si la compo Neuilly y figure et pourquoi elle ne
// correspond à aucun joueur de l'effectif FootLight (25 joueurs).
//
// Aucune écriture en base.
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const GROUPE = 'E';
const WETTBEWERB = `FR5${GROUPE}`;
const SAISON_ID_TM = '2026';
const CALENDRIER_ID_CIBLE = 1225;

function normaliserNom(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]+/g, ' ').trim();
}
function distanceLevenshtein(a, b) {
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      d[i][j] = a[i - 1] === b[j - 1] ? d[i - 1][j - 1] : 1 + Math.min(d[i - 1][j], d[i][j - 1], d[i - 1][j - 1]);
    }
  }
  return d[m][n];
}
function trouveCorrespondanceNom(nomAffiche, nomJoueur) {
  const mots = normaliserNom(nomAffiche).split(' ').filter(Boolean);
  const nomCible = normaliserNom(nomJoueur);
  let meilleurApproche = null;
  for (let debut = 1; debut < mots.length; debut++) {
    const candidat = mots.slice(debut).join(' ');
    const prenomAffiche = mots.slice(0, debut).join(' ');
    if (candidat === nomCible) return { prenomAffiche, exact: true };
    if (meilleurApproche) continue;
    const seuil = candidat.length >= 8 ? 2 : 1;
    if (distanceLevenshtein(candidat, nomCible) <= seuil) { meilleurApproche = { prenomAffiche, exact: false }; continue; }
    const premierMot = candidat.split(' ')[0];
    if (premierMot && distanceLevenshtein(premierMot, nomCible) <= 1) meilleurApproche = { prenomAffiche, exact: false };
  }
  return meilleurApproche;
}

const { data: joueursNeuilly } = await supabase
  .from('joueurs').select('id, prenom, nom, club')
  .eq('niveau', 'N2').eq('saison', '2026-2027').ilike('club', '%neuilly%');
console.log(`Effectif Neuilly côté FootLight : ${(joueursNeuilly || []).length} joueur(s).\n`);

const browser = await chromium.launch();
const page = await browser.newPage({ locale: 'fr-FR', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36' });

let urlMatch = null;
for (let journee = 1; journee <= 3; journee++) {
  const urlJournee = `https://www.transfermarkt.fr/national-2/spieltag/wettbewerb/${WETTBEWERB}/saison_id/${SAISON_ID_TM}/spieltag/${journee}`;
  await page.goto(urlJournee, { waitUntil: 'networkidle', timeout: 45000 });
  const hrefs = await page.evaluate(() => [...document.querySelectorAll('a[href*="/spielbericht/index/spielbericht/"]')].map((a) => a.getAttribute('href')));
  console.log(`--- Journée ${journee} : ${[...new Set(hrefs)].length} match(s) ---`);
  for (const href of [...new Set(hrefs)]) {
    const testUrl = `https://www.transfermarkt.fr${href}`;
    await page.goto(testUrl, { waitUntil: 'networkidle', timeout: 45000 });
    const titre = await page.title();
    console.log(`  "${titre}"`);
    if (/neuilly/i.test(titre) && !urlMatch) {
      console.log(`  ^ contient "neuilly" -> URL : ${testUrl}`);
      urlMatch = testUrl;
    }
  }
}

if (!urlMatch) {
  console.log('Match Neuilly/Sochaux introuvable côté Transfermarkt pour ce wettbewerb (journées 1-3).');
  await browser.close();
  process.exit(0);
}

const compositionsToutes = await page.evaluate(() => {
  return [...document.querySelectorAll('table')].map((t) => {
    const lignes = [...t.querySelectorAll('tr')].map((tr) => [...tr.querySelectorAll('td,th')].map((td) => (td.textContent || '').trim()));
    const joueurs = [];
    for (const l of lignes) {
      if (l.length === 2 && l[1] && !['Officielle', 'Probable'].includes(l[1]) && !['Manager', 'Entraîneur', 'Entraineur'].includes(l[0])) {
        for (const nom of l[1].split(',').map((s) => s.trim()).filter(Boolean)) joueurs.push(nom);
      }
    }
    return joueurs;
  });
});

console.log(`${compositionsToutes.length} table(s) trouvée(s) sur la page.\n`);
compositionsToutes.forEach((noms, i) => {
  if (!noms.length) return;
  console.log(`--- Table ${i} (${noms.length} nom(s)) ---`);
  for (const nom of noms) {
    const matches = (joueursNeuilly || []).filter((j) => trouveCorrespondanceNom(nom, j.nom));
    if (matches.length) {
      console.log(`  "${nom}" -> correspond à : ${matches.map((m) => `${m.prenom} ${m.nom}`).join(', ')}`);
    } else {
      console.log(`  "${nom}" -> AUCUNE correspondance dans l'effectif Neuilly FootLight`);
    }
  }
  console.log('');
});

await browser.close();
