// Importe l'effectif Hyères 83 FC (saison 26/27, capture Transfermarkt) dans
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

const CLUB = 'Hyères 83 FC';
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
  ['Florian', 'Verplanck', 'gardien', '1992-02-17'],
  ['Florian', 'Andreani', 'gardien', '1997-01-28'],
  ['Moussa', 'Kouyaté', 'defenseur_central', '1994-04-18'],
  ['Laurenzo', 'Monteiro', 'defenseur_central', '2004-05-28'],
  ['Valentin', 'Hoguet', 'defenseur_central', '1999-01-05'],
  ['Mamadou', 'Savane', 'defenseur_central', '1996-01-22'],
  ['Yann', 'Djabou', 'lateral_gauche', '1992-04-08'],
  ['Hugues', 'Daniel', 'lateral_gauche', '2000-10-12'],
  ['Alex', 'Guett', 'lateral_droit', '2002-11-26'],
  ['Tyrone', 'Sakho', 'milieu_defensif', '2004-02-08'],
  ['Mattéo', 'Brossel', 'milieu_defensif', '2002-03-25'],
  ['Yanis', 'Lasri', 'milieu_central', '2005-05-03'],
  ['Eric', 'Mathieu', 'milieu_central', '1994-11-19'],
  ['Arnaud', 'Buisson', 'milieu_central', '1994-05-09'],
  ['Esteban', 'Hari', 'milieu_central', '1999-12-10'],
  ['Keny', 'Moulet', 'ailier_droit', '1991-09-02'],
  ['Cheick Alan', 'Diarra', 'milieu_offensif', '1993-06-23'],
  ['Abdoulaye', 'Diaby', 'milieu_offensif', '1994-11-11'],
  ['Axel', 'Tressens', 'ailier_gauche', '1999-08-02'],
  ['Erwan', 'Moutault', 'ailier_gauche', '1999-09-14'],
  ['Dylan', 'Okyere', 'ailier_droit', '2001-07-18'],
  ['Abdsamad', 'Aniss', 'attaquant', '2004-03-02'],
  ['Yohan', 'Brun', 'attaquant', '1994-09-19'],
  ['Ibrahim', 'Fofana', 'attaquant', '1994-09-03'],
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
