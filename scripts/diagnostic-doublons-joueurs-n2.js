// Diagnostic lecture seule : le diagnostic de répartition des matchs joués
// en N2 (diagnostic-n2-repartition-matchs-joues.js) rapporte Herman
// Lemaître (Fc St Lo Manche 1) comme un joueur à 0 match — alors que ses 2
// buts (Milizac 29/08, Stade Rennais B 05/09) ont été confirmés écrits
// plus tôt cette session (rattrapage-buts-cartons-transfermarkt-n2.js).
// 188/210 joueurs du groupe C à 0 match est incohérent avec les 331 lignes
// matchs_joueur à minutes renseignées rapportées par ce même rattrapage.
//
// Hypothèse : il existe PLUSIEURS lignes "joueurs" pour un même joueur réel
// (doublon), et les lignes matchs_joueur avec les vraies stats sont liées à
// un joueur_id différent de celui renvoyé par la requête
// .eq('niveau','N2') utilisée dans le diagnostic — cohérent avec
// l'existence de plusieurs scripts dédiés aux doublons N2 groupe C dans ce
// dépôt (corrige-doublons-groupe-c-abbreviations.js, fusionne-epagna.js...).
//
// Recherche tous les joueurs "lemaitre"/"lemaître" et affiche, pour chacun,
// son niveau/saison/club et son nombre de matchs_joueur avec minutes
// renseignées.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const NOM = process.env.NOM_RECHERCHE || 'lemaitre';
const { data: candidats, error } = await supabase
  .from('joueurs').select('id, prenom, nom, club, niveau, saison, matchs_joues')
  .or(`nom.ilike.%${NOM}%,nom.ilike.%lemaître%`);
if (error) { console.error('Erreur :', error.message); process.exit(1); }
console.log(`${candidats.length} ligne(s) joueurs correspondant à "${NOM}"/"lemaître" :\n`);
for (const j of candidats) {
  const { data: mj } = await supabase.from('matchs_joueur').select('date_match, adversaire, minutes_jouees, buts').eq('joueur_id', j.id).order('date_match');
  const avecMinutes = (mj || []).filter((m) => m.minutes_jouees != null);
  console.log(`id=${j.id} ${j.prenom} ${j.nom} club="${j.club}" niveau=${j.niveau} saison=${j.saison} matchs_joues(agrégat)=${j.matchs_joues}`);
  console.log(`  ${(mj || []).length} ligne(s) matchs_joueur, ${avecMinutes.length} avec minutes renseignées :`);
  for (const m of (mj || [])) console.log(`    ${m.date_match} vs ${m.adversaire} — minutes=${m.minutes_jouees} buts=${m.buts}`);
  console.log('');
}

// Vérifie aussi s'il existe des clubs "Fc St Lo Manche" sous plusieurs
// orthographes dans calendrier_officiel (source probable des doublons).
const { data: cal } = await supabase.from('calendrier_officiel').select('id, groupe, equipe_domicile, equipe_exterieur').eq('division', 'N2').eq('saison', '2026-2027').or('equipe_domicile.ilike.%lo manche%,equipe_exterieur.ilike.%lo manche%');
console.log(`=== Lignes calendrier_officiel N2 mentionnant "lo manche" ===`);
const clubsVus = new Set();
for (const c of cal || []) { clubsVus.add(c.equipe_domicile); clubsVus.add(c.equipe_exterieur); }
console.log([...clubsVus].filter((c) => /lo manche/i.test(c)).join(' | '));
