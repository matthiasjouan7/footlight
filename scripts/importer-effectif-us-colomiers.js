// Importe l'effectif US Colomiers (saison 26/27, capture Transfermarkt) dans
// la table joueurs. Vérifie les doublons potentiels puis affiche un aperçu
// avant toute écriture.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);

const supabase = createClient(supabaseUrl, supabaseKey);

const CLUB = 'US Colomiers';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

function normalizeName(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}
function slugifyName(s) {
  return normalizeName(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x';
}

// Dimaël Clichy listé « Défense » (générique) → defenseur_central (confirmé).
// Thomas Luga listé « Milieu » (générique) → milieu_defensif (confirmé).
// [prenom, nom, poste, date_naissance ISO]
const NOUVEAUX = [
  ['Thomas', 'Himeur', 'gardien', '2001-01-17'],
  ['Gabin', 'Sabathié', 'gardien', '2006-09-28'],
  ['Rui', 'Carvalho', 'gardien', '2003-08-13'],
  ['Dimaël', 'Clichy', 'defenseur_central', '2002-02-05'],
  ['Yakouba', 'Touré', 'defenseur_central', '2006-11-28'],
  ['Ayachi', 'Missaoui', 'defenseur_central', '1997-04-02'],
  ['Pierre-Yves', 'Polomat', 'lateral_gauche', '1993-12-27'],
  ['Mathieu', 'Gonçalves', 'lateral_gauche', '2001-06-08'],
  ['Rudy', 'Loirette', 'lateral_droit', '1998-07-20'],
  ['Thomas', 'Biziki', 'lateral_droit', '1995-05-22'],
  ['Jordan', 'Adéoti', 'milieu_defensif', '1989-03-12'],
  ['Saïdou', 'Sam', 'milieu_defensif', '1995-02-04'],
  ['Thomas', 'Luga', 'milieu_defensif', '2000-02-22'],
  ['Quentin', 'Ranquine', 'milieu_defensif', '2002-03-18'],
  ['Santino', 'Cucchiara', 'milieu_central', '2002-03-13'],
  ['Gabin', 'Legrand', 'milieu_offensif', '2001-04-06'],
  ['Abdoul', 'Aboubacar', 'milieu_offensif', '2005-09-08'],
  ['Emmanuel', 'Attah', 'ailier_droit', '2000-07-26'],
  ['Dylan', 'Cueye', 'attaquant', '2004-04-02'],
  ['Teddy', 'Suares', 'attaquant', '2003-07-02'],
];

const CORRECTIONS = [];

// Supabase plafonne chaque requête à 1000 lignes (db-max-rows) : au-delà, il
// faut paginer avec .range() sous peine de manquer des doublons situés après
// la 1000e ligne.
let joueurs = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase.from('joueurs').select('id, prenom, nom, club, niveau, poste').range(from, from + 999);
  if (error) { console.error('Erreur lecture joueurs :', error.message); process.exit(1); }
  if (!data || !data.length) break;
  joueurs = joueurs.concat(data);
  if (data.length < 1000) break;
}

let doublons = 0;
for (const [prenom, nom] of NOUVEAUX) {
  const np = normalizeName(prenom), nn = normalizeName(nom);
  const matches = (joueurs || []).filter((j) => normalizeName(j.prenom) === np && normalizeName(j.nom) === nn);
  for (const match of matches) {
    doublons++;
    console.log(`DOUBLON : ${prenom} ${nom} existe déjà (id=${match.id}, club actuel="${match.club}", niveau="${match.niveau}", poste="${match.poste}")`);
  }
}
console.log(`${doublons} doublon(s) potentiel(s) sur ${NOUVEAUX.length} joueurs de l'effectif.\n`);

const lignes = NOUVEAUX.map(([prenom, nom, poste, date_naissance]) => ({
  prenom, nom, poste, club: CLUB, niveau: NIVEAU, saison: SAISON, date_naissance,
  email: `${slugifyName(prenom)}.${slugifyName(nom)}.manuel@scoute.footlight.fr`,
  matchs_joues: 0, buts: 0, badge: 'declaratif', profil_public: false,
}));

console.log(`${lignes.length} joueur(s) à insérer :`);
for (const l of lignes) console.log(`  ${l.prenom} ${l.nom} | poste=${l.poste} | né(e) le ${l.date_naissance}`);

console.log(`\n${CORRECTIONS.length} correction(s)/transfert(s) à appliquer :`);
for (const c of CORRECTIONS) console.log(`  ${c.prenom} ${c.nom} → club="${CLUB}", niveau="${NIVEAU}", poste="${c.poste}"`);

if (!dryRun) {
  const { error: insErr } = await supabase.from('joueurs').insert(lignes);
  if (insErr) { console.error('Erreur insertion :', insErr.message); process.exit(1); }
  for (const c of CORRECTIONS) {
    const { error: updErr } = await supabase.from('joueurs').update({ club: CLUB, niveau: NIVEAU, poste: c.poste }).eq('id', c.id);
    if (updErr) { console.error(`Erreur mise à jour correction ${c.prenom} ${c.nom} :`, updErr.message); process.exit(1); }
  }
  console.log('\nTerminé.');
} else {
  console.log('\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour appliquer réellement.');
}
