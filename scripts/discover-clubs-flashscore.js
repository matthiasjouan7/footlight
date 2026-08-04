// Découverte (lecture seule, une seule navigation) des clubs d'un groupe
// flashscore.fr ayant au moins un joueur FootLight — sert à savoir quels
// clubs visiter individuellement avec sync-flashscore-officielles.js,
// plutôt que de boucler les navigations dans un seul script (instable
// constaté avec Playwright sur flashscore.fr, voir historique du projet).
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const classementUrl = process.env.TARGET_URL;
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!classementUrl) { console.error('TARGET_URL manquant.'); process.exit(1); }
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

function normaliser(str) {
  return (str || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[.'/-]/g, ' ').replace(/\s+/g, ' ').trim();
}
const MOTS_GENERIQUES_CLUB = new Set(['fc', 'ofc', 'afc', 'asc', 'ac', 'sc', 'csc', 'cs', 'us', 'uso', 'as', 'sm', 'football', 'club', 'sporting', 'racing', 'stade', 'olympique']);
function motsClub(s) {
  const mots = normaliser(s).split(' ').filter(Boolean).filter((w) => !MOTS_GENERIQUES_CLUB.has(w));
  return mots.length ? mots : normaliser(s).split(' ').filter(Boolean);
}
function clubsCorrespondent(a, b) {
  const wa = new Set(motsClub(a)), wb = new Set(motsClub(b));
  if (!wa.size || !wb.size) return false;
  const [small, big] = wa.size <= wb.size ? [wa, wb] : [wb, wa];
  for (const w of small) if (!big.has(w)) return false;
  return true;
}

const { data: joueursFootlight, error: jErr } = await supabase.from('joueurs').select('id, prenom, nom, club');
if (jErr) { console.error('Erreur lecture joueurs :', jErr.message); process.exit(1); }

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(classementUrl, { waitUntil: 'networkidle', timeout: 60000 });

const clubsGroupe = await page.evaluate(() => {
  const liens = [...document.querySelectorAll('a[href*="/equipe/"]')]
    .map((a) => ({ text: a.textContent.trim(), href: a.getAttribute('href') }))
    .filter((l) => l.text && l.href);
  return [...new Map(liens.map((l) => [l.href, l])).values()];
});
await browser.close();

console.log(`${clubsGroupe.length} club(s) trouvé(s) dans le groupe.`);

const clubsAvecJoueurs = clubsGroupe
  .map((c) => ({
    club: c.text,
    effectif_url: new URL(c.href.replace(/\/?$/, '/') + 'effectif/', classementUrl).toString(),
    joueurs: (joueursFootlight || []).filter((j) => clubsCorrespondent(j.club, c.text)).map((j) => `${j.prenom} ${j.nom}`),
  }))
  .filter((c) => c.joueurs.length > 0);

console.log(`\n${clubsAvecJoueurs.length} club(s) avec au moins un joueur FootLight :`);
clubsAvecJoueurs.forEach((c) => {
  console.log(`\n- ${c.club} (${c.joueurs.length} joueur(s) : ${c.joueurs.join(', ')})`);
  console.log(`  ${c.effectif_url}`);
});
