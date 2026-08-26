// Diagnostic lecture seule : parmi les joueurs du classement des passeurs
// foot-direct.com (Ligue 3), lesquels n'ont aucune correspondance dans la
// base FootLight (niveau Ligue 3, saison 2026-2027) ? Utile pour repérer
// des inscriptions manquantes, mais attention : un nom absent peut aussi
// être un vrai non-inscrit OU un homonyme dont l'abrégé ne matche pas
// exactement (nom composé, accent, etc.) — à vérifier au cas par cas avant
// toute création de fiche.
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

const url = 'https://www.foot-direct.com/france/ligue-3/classement-passeurs';
const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
if (!res.ok) { console.error(`Échec chargement (${res.status}).`); process.exit(1); }
const html = await res.text();
const $ = cheerio.load(html);

const classement = [];
$('table').first().find('tr').each((_, tr) => {
  const cols = $(tr).find('td, th').map((_, td) => $(td).text().trim()).get();
  if (cols.length < 3) return;
  const [, joueur, pd] = cols;
  const nbPd = parseInt(pd, 10);
  if (!joueur || Number.isNaN(nbPd)) return;
  classement.push({ joueur, pd: nbPd });
});
console.log(`${classement.length} joueur(s) dans le classement.`);

const { data: joueurs, error } = await supabase
  .from('joueurs')
  .select('prenom, nom, club')
  .eq('niveau', 'Ligue 3')
  .eq('saison', '2026-2027');
if (error) { console.error('Erreur lecture joueurs :', error.message); process.exit(1); }

const abregesFootlight = new Set(joueurs.map((j) => abregeAttendu(j.prenom, j.nom)));

console.log('\nSans correspondance FootLight (Ligue 3, 2026-2027) :');
let nbSansCorrespondance = 0;
for (const { joueur, pd } of classement) {
  const abrege = normaliser(joueur);
  if (!abregesFootlight.has(abrege)) {
    console.log(`  ${joueur} — ${pd} PD`);
    nbSansCorrespondance++;
  }
}
console.log(`\n${nbSansCorrespondance} / ${classement.length} sans correspondance.`);
