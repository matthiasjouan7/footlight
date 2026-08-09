// Importe l'effectif FC Chauray (saison 26/27, capture Transfermarkt) dans
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

const CLUB = 'FC Chauray';
const NIVEAU = 'N1';
const SAISON = '2026-2027';

function normalizeName(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}
function slugifyName(s) {
  return normalizeName(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x';
}

// [prenom, nom, poste, date_naissance ISO]
const NOUVEAUX = [
  ['Saturnin', 'Allagbé', 'gardien', '1993-11-22'],
  ['Mattéo', 'Mayoulika', 'gardien', '2004-03-18'],
  ['Seydoux', 'Wassa', 'defenseur_central', '2004-02-04'],
  ['Dan', 'Bokelo Isenge', 'defenseur_central', '2006-08-02'],
  ['Otchowan', 'Abese', 'defenseur_central', '2005-01-19'],
  ['Balamine', 'Cissé', 'defenseur_central', '2001-08-14'],
  ['Gabin', 'Delguel', 'lateral_gauche', '2001-01-20'],
  ['Mathis', 'Jouve', 'lateral_gauche', '2004-09-04'],
  ['Sami', 'Boughanmi', 'lateral_gauche', '2005-06-23'],
  ['Maël', 'Sedagondji', 'lateral_droit', '1999-08-23'],
  ['Haris', 'Alic', 'milieu_defensif', '1994-06-22'],
  ['Nail', 'Belaggoune', 'milieu_central', '2002-06-21'],
  ['Benjamin', 'Barcq', 'milieu_central', '1997-08-15'],
  ['Alexy', 'Do Rogeiro', 'milieu_central', '2001-03-17'],
  ['Ludovic', 'Faucher', 'milieu_offensif', '1998-03-10'],
  ['Maxime', 'Bisleau', 'milieu_offensif', '2004-03-18'],
  ['Warren', 'Ngako', 'ailier_gauche', '2004-12-03'],
  ['Soufian', 'Awragh', 'ailier_gauche', '2005-02-23'],
  ['Mehdi', 'Mousseni', 'ailier_gauche', '2004-05-29'],
  ['Jilvaro', 'Luyinga', 'ailier_gauche', '2001-11-03'],
  ['Ivane', 'Chegra', 'ailier_droit', '2004-03-03'],
  ['Daouda', 'Bassock', 'ailier_droit', '1995-03-13'],
  ['Doua', 'Dembélé', 'attaquant', '2001-08-27'],
  ['Jérôme', 'Lemoine', 'attaquant', '1998-07-22'],
];

const { data: joueurs, error: jErr } = await supabase.from('joueurs').select('id, prenom, nom, club, niveau, poste');
if (jErr) { console.error('Erreur lecture joueurs :', jErr.message); process.exit(1); }

let doublons = 0;
for (const [prenom, nom] of NOUVEAUX) {
  const np = normalizeName(prenom), nn = normalizeName(nom);
  const match = (joueurs || []).find((j) => normalizeName(j.prenom) === np && normalizeName(j.nom) === nn);
  if (match) {
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

if (!dryRun) {
  const { error: insErr } = await supabase.from('joueurs').insert(lignes);
  if (insErr) { console.error('Erreur insertion :', insErr.message); process.exit(1); }
  console.log('\nTerminé.');
} else {
  console.log('\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour appliquer réellement.');
}
