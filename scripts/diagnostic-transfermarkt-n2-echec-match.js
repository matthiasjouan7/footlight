// Diagnostic lecture seule : sync-transfermarkt-match-stats-n2.js échoue à
// retrouver la quasi-totalité des joueurs pour de nombreux matchs N2
// (groupes D/F/G notamment, ex. 203/137/87 "non trouvés" en DRY_RUN sur
// 2 journées). Dump, pour UN match donné (calendrier_officiel_id fourni),
// exactement ce que le parseur extrait (compositions brutes, attribution
// domicile/extérieur, noms calculés) et la liste des joueurs FootLight
// déjà connus pour ce match, afin de voir où le rapprochement diverge.
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const CALENDRIER_OFFICIEL_ID = parseInt(process.env.CALENDRIER_OFFICIEL_ID || '1591', 10);
const GROUPE = (process.env.GROUPE || 'G').toUpperCase();
const SAISON_ID_TM = '2026';

const { data: ligneCal, error: errCal } = await supabase
  .from('calendrier_officiel')
  .select('id, equipe_domicile, equipe_exterieur, date_match, groupe')
  .eq('id', CALENDRIER_OFFICIEL_ID).maybeSingle();
if (errCal || !ligneCal) { console.error('calendrier_officiel introuvable :', errCal?.message); process.exit(1); }
console.log(`Match ciblé : ${ligneCal.equipe_domicile} vs ${ligneCal.equipe_exterieur} (${ligneCal.date_match}, groupe ${ligneCal.groupe})\n`);

const { data: lignesMj } = await supabase.from('matchs_joueur').select('id, joueur_id, minutes_jouees').eq('calendrier_officiel_id', CALENDRIER_OFFICIEL_ID);
const joueurIds = (lignesMj || []).map((l) => l.joueur_id);
const { data: joueurs } = await supabase.from('joueurs').select('id, prenom, nom, club').in('id', joueurIds);
console.log(`${(joueurs || []).length} joueur(s) FootLight déjà rattaché(s) à ce match :`);
for (const j of joueurs || []) console.log(`  - ${j.prenom} ${j.nom} (club="${j.club}")`);
console.log('');

// ---- Trouve l'URL du match sur Transfermarkt (parcourt les journées 1-3) ----
const browser = await chromium.launch(process.env.PW_EXECUTABLE_PATH ? { executablePath: process.env.PW_EXECUTABLE_PATH } : {});
const page = await browser.newPage({ locale: 'fr-FR', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36' });

let urlMatch = null;
for (let journee = 1; journee <= 3 && !urlMatch; journee++) {
  const urlJournee = `https://www.transfermarkt.fr/national-2/spieltag/wettbewerb/FR5${GROUPE}/saison_id/${SAISON_ID_TM}/spieltag/${journee}`;
  await page.goto(urlJournee, { waitUntil: 'networkidle', timeout: 45000 });
  const liens = await page.evaluate(() => [...document.querySelectorAll('a[href*="/spielbericht/index/spielbericht/"]')].map((a) => a.getAttribute('href')));
  for (const href of [...new Set(liens)]) {
    const testUrl = `https://www.transfermarkt.fr${href}`;
    await page.goto(testUrl, { waitUntil: 'networkidle', timeout: 45000 });
    const titre = await page.title();
    if (titre.includes(ligneCal.equipe_domicile.split(' ')[0]) || titre.toLowerCase().includes('ales') || titre.toLowerCase().includes('berre')) {
      console.log(`Journée ${journee} — candidat titre : "${titre}" (${testUrl})`);
    }
    const mTitre = titre.match(/^(.+?) - (.+?), /);
    if (mTitre) {
      const [, dom, ext] = mTitre;
      // Rapprochement grossier par mot commun pour retrouver le bon match.
      const motsCal = (ligneCal.equipe_domicile + ' ' + ligneCal.equipe_exterieur).toLowerCase();
      if (motsCal.includes(dom.toLowerCase().split(' ')[0]) || motsCal.includes(ext.toLowerCase().split(' ')[0])) {
        urlMatch = testUrl;
        console.log(`-> Match retenu : "${titre}"\n`);
        break;
      }
    }
  }
}
if (!urlMatch) { console.log('Match introuvable sur Transfermarkt dans les 3 premières journées.'); await browser.close(); process.exit(0); }

await page.goto(urlMatch, { waitUntil: 'networkidle', timeout: 45000 });
await page.waitForTimeout(500);

const compositionsToutes = await page.evaluate(() => {
  return [...document.querySelectorAll('table')].map((t) => {
    const lignes = [...t.querySelectorAll('tr')].map((tr) => [...tr.querySelectorAll('td,th')].map((td) => (td.textContent || '').trim()));
    const joueurs = [];
    for (const l of lignes) {
      if (l.length === 2 && l[1] && !['Officielle', 'Probable'].includes(l[1])) {
        for (const nom of l[1].split(',').map((s) => s.trim()).filter(Boolean)) joueurs.push(nom);
      }
    }
    return joueurs;
  });
});
console.log(`${compositionsToutes.length} <table> trouvée(s) sur la page. Contenu de chacune (>=1 nom) :`);
compositionsToutes.forEach((noms, i) => {
  if (noms.length) console.log(`  Table ${i} (${noms.length} nom(s)) : ${JSON.stringify(noms)}`);
});

await browser.close();
