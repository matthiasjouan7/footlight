// Synchronise les passes décisives depuis le classement des passeurs de
// foot-direct.com, puisque L'Équipe (notre source habituelle pour buts/
// cartons/minutes) ne publie cette donnée pour aucun joueur (confirmé par
// diagnostic-assists-bensoula.js : aucune clé "passe" dans le bloc
// "specifics" scrapé). Demandé par l'utilisateur après vérification que
// Kamil Bensoula (VFC La Roche-sur-Yon, Ligue 3) y apparaît avec 2 PD.
//
// Rapprochement par nom abrégé ("K. Bensoula"), même logique que
// lib-sync-lequipe-match-stats.js (abregeAttendu) : ignore les cas
// ambigus (deux joueurs FootLight du même niveau/saison partageant le
// même abrégé). N'écrit QUE pour les joueurs trouvés dans le classement
// (positifs) — un joueur absent du classement n'est pas forcé à 0, comme
// pour les buts/cartons L'Équipe (silence ≠ preuve de zéro).
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';

const dryRun = process.env.DRY_RUN !== 'false';
const classementUrl = process.env.CLASSEMENT_URL || 'https://www.foot-direct.com/france/ligue-3/classement-passeurs';
const niveau = process.env.NIVEAU || 'Ligue 3';
const saison = process.env.SAISON || '2026-2027';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

function normaliser(str) {
  return (str || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
function abregeAttendu(prenom, nom) {
  if (!prenom || !nom) return null;
  return normaliser(`${prenom[0]}. ${nom}`);
}

console.log(`Chargement du classement : ${classementUrl}`);
const res = await fetch(classementUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
if (!res.ok) { console.error(`Échec chargement (${res.status}).`); process.exit(1); }
const html = await res.text();
const $ = cheerio.load(html);

const classement = new Map(); // abrege normalisé -> PD
$('table').first().find('tr').each((_, tr) => {
  const cols = $(tr).find('td, th').map((_, td) => $(td).text().trim()).get();
  if (cols.length < 3) return;
  const [, joueur, pd] = cols;
  const nbPd = parseInt(pd, 10);
  if (!joueur || Number.isNaN(nbPd)) return;
  classement.set(normaliser(joueur), nbPd);
});
console.log(`${classement.size} ligne(s) de classement chargée(s).`);

const { data: joueurs, error } = await supabase
  .from('joueurs')
  .select('id, prenom, nom, passes_decisives')
  .eq('niveau', niveau)
  .eq('saison', saison);
if (error) { console.error('Erreur lecture joueurs :', error.message); process.exit(1); }
console.log(`${joueurs.length} joueur(s) FootLight en ${niveau} saison ${saison}.`);

let maj = 0, dejaRenseignes = 0, ambigus = 0;
for (const j of joueurs) {
  const attendu = abregeAttendu(j.prenom, j.nom);
  if (!attendu || !classement.has(attendu)) continue;

  const ambiguite = joueurs.some((autre) => autre !== j && abregeAttendu(autre.prenom, autre.nom) === attendu);
  if (ambiguite) {
    console.log(`  ${j.prenom} ${j.nom} : ambigu (plusieurs joueurs FootLight partagent "${attendu}"), ignoré.`);
    ambigus++;
    continue;
  }

  const pd = classement.get(attendu);
  if (j.passes_decisives === pd) continue;
  if (j.passes_decisives != null && j.passes_decisives !== 0) {
    console.log(`  ${j.prenom} ${j.nom} : passes_decisives déjà renseigné (${j.passes_decisives}), non modifié malgré ${pd} détecté(s) sur foot-direct.`);
    dejaRenseignes++;
    continue;
  }
  console.log(`  ${j.prenom} ${j.nom} : passes_decisives ${j.passes_decisives ?? 0} -> ${pd}`);
  maj++;
  if (!dryRun) {
    const { error: updErr } = await supabase.from('joueurs').update({ passes_decisives: pd }).eq('id', j.id);
    if (updErr) console.log(`    Erreur écriture : ${updErr.message}`);
  }
}

console.log(`\nRésumé : ${maj} mise(s) à jour ${dryRun ? 'proposée(s)' : 'effectuée(s)'}, ${dejaRenseignes} déjà renseigné(s) laissé(s) tel quel, ${ambigus} ambiguïté(s) ignorée(s).`);
if (dryRun) console.log('DRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
