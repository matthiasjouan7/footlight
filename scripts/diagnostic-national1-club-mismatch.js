// Diagnostic lecture seule : sync-foot-direct-passes.js trouve "0
// candidat(s)" pour des matchs du 22 août 2026 (journée 1) qui existent
// pourtant bien dans calendrier_officiel (ex: "BIESHEIM ASC vs US ST MAUR
// LUSITANOS"), alors que "Biesheim" seul se rapproche correctement ailleurs
// dans le même run — suspicion : abréviation "St"/"Saint" non normalisée de
// façon identique des deux côtés. Dump les mots retenus par motsClub() pour
// les deux côtés d'un cas précis, sans deviner.
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'fr-FR,fr;q=0.9',
};
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

function normaliserClub(str) {
  return (str || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[.'/-]/g, ' ').replace(/\s+/g, ' ').trim();
}
const MOTS_GENERIQUES_CLUB = new Set(['fc', 'ofc', 'afc', 'asc', 'ac', 'sc', 'csc', 'cs', 'us', 'uso', 'as', 'sm', 'sa', 'vf', 'football', 'club', 'sporting', 'racing', 'stade', 'olympique', 'sur', 'sous', 'en', 'la', 'le', 'les', 'de', 'du', 'des']);
function motsClub(s) {
  const mots = normaliserClub(s).split(' ').filter(Boolean).filter((w) => !MOTS_GENERIQUES_CLUB.has(w));
  return mots.length ? mots : normaliserClub(s).split(' ').filter(Boolean);
}

// ---- 1. Page de division : trouver l'URL du match Biesheim vs St Maur ----
const resDiv = await fetch('https://www.foot-direct.com/france/national-1/', { headers: HEADERS });
const htmlDiv = await resDiv.text();
const $div = cheerio.load(htmlDiv);
const matchUrls = [...new Set(
  $div('a[href*="/live/"]').map((i, el) => $div(el).attr('href')).get()
    .filter((h) => /\/live\/\d+-/.test(h))
    .map((h) => new URL(h, 'https://www.foot-direct.com/').toString())
)];
console.log(`${matchUrls.length} URL(s) trouvée(s) sur la page de division :`);
for (const u of matchUrls) console.log(`  ${u}`);

const urlBiesheim = matchUrls.find((u) => /biesheim/i.test(u));
if (!urlBiesheim) { console.log('\nURL Biesheim non trouvée directement sur la page de division (peut-être disparue), on continue quand même avec les mots du slug si trouvé.'); }
else {
  console.log(`\nURL retenue : ${urlBiesheim}`);
  const slug = urlBiesheim.split('/live/')[1]?.replace(/^\d+-/, '').replace(/\/$/, '') || '';
  console.log(`Slug brut : "${slug}"`);
  const [a, b] = slug.split('-vs-').map((p) => p.replace(/-/g, ' '));
  console.log(`equipeA (slug) : "${a}" -> mots : ${JSON.stringify(motsClub(a))}`);
  console.log(`equipeB (slug) : "${b}" -> mots : ${JSON.stringify(motsClub(b))}`);
}

// ---- 2. Ligne calendrier_officiel correspondante ----
const { data } = await supabase
  .from('calendrier_officiel')
  .select('equipe_domicile, equipe_exterieur, date_match')
  .eq('division', 'N1')
  .eq('date_match', '2026-08-22')
  .ilike('equipe_domicile', '%BIESHEIM%');
console.log('\nLigne(s) calendrier_officiel "Biesheim" du 22/08 :');
for (const m of data || []) {
  console.log(`  "${m.equipe_domicile}" vs "${m.equipe_exterieur}"`);
  console.log(`    domicile -> mots : ${JSON.stringify(motsClub(m.equipe_domicile))}`);
  console.log(`    exterieur -> mots : ${JSON.stringify(motsClub(m.equipe_exterieur))}`);
}
