// Diagnostic lecture seule : même vérification que
// diagnostic-passeurs-non-inscrits.js, mais pour le classement des buteurs
// foot-direct.com (Ligue 3) — demandé par l'utilisateur pour vérifier que
// tous les attaquants/buteurs y figurant sont bien inscrits sur FootLight.
import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

function normaliser(str) {
  return (str || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
function abregeAttendu(prenom, nom) {
  if (!prenom || !nom) return null;
  return normaliser(`${prenom[0]}. ${nom}`);
}

const url = 'https://www.foot-direct.com/france/ligue-3/classement-buteurs';
const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
if (!res.ok) { console.error(`Échec chargement (${res.status}).`); process.exit(1); }
const html = await res.text();
const $ = cheerio.load(html);

const classement = [];
$('table').first().find('tr').each((_, tr) => {
  const cols = $(tr).find('td, th').map((_, td) => $(td).text().trim()).get();
  if (cols.length < 3) return;
  const [, joueur, buts] = cols;
  const nbButs = parseInt(buts, 10);
  if (!joueur || Number.isNaN(nbButs)) return;
  classement.push({ joueur, buts: nbButs });
});
console.log(`${classement.length} joueur(s) dans le classement des buteurs.`);

const { data: joueurs, error } = await supabase
  .from('joueurs')
  .select('prenom, nom, club, buts')
  .eq('niveau', 'Ligue 3')
  .eq('saison', '2026-2027');
if (error) { console.error('Erreur lecture joueurs :', error.message); process.exit(1); }

const parAbrege = new Map();
for (const j of joueurs) {
  const a = abregeAttendu(j.prenom, j.nom);
  if (!a) continue;
  parAbrege.set(a, [...(parAbrege.get(a) || []), j]);
}

console.log('\nSans correspondance FootLight (Ligue 3, 2026-2027) :');
let nbSansCorrespondance = 0;
for (const { joueur, buts } of classement) {
  const abrege = normaliser(joueur);
  if (!parAbrege.has(abrege)) {
    console.log(`  ${joueur} — ${buts} but(s)`);
    nbSansCorrespondance++;
  }
}
console.log(`\n${nbSansCorrespondance} / ${classement.length} sans correspondance.`);

console.log('\nAvec correspondance mais buts FootLight différents du classement :');
for (const { joueur, buts } of classement) {
  const abrege = normaliser(joueur);
  const candidats = parAbrege.get(abrege);
  if (!candidats || candidats.length !== 1) continue;
  const j = candidats[0];
  if ((j.buts ?? 0) !== buts) {
    console.log(`  ${j.prenom} ${j.nom} (${j.club}) : FootLight=${j.buts ?? 0} vs foot-direct=${buts}`);
  }
}
