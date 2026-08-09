// Importe l'effectif FC Limonest (saison 26/27, capture Transfermarkt) dans
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

const CLUB = 'FC Limonest';
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
  ['Kayne', 'Bonnevie', 'gardien', '2001-07-22'],
  ['Matéo', 'Pereira', 'gardien', '2005-10-15'],
  ['Joseph', 'Ostrowski', 'gardien', '1998-02-03'],
  ['Théo', 'Braillon', 'defenseur_central', '2000-05-09'],
  ['Alexandre', 'Roselli', 'defenseur_central', '1997-03-17'],
  ['Nathan', 'Tanard', 'lateral_gauche', '1997-06-18'],
  ['Davis', 'Abanda', 'lateral_droit', '2000-06-07'],
  ['Bryan', 'Pellier', 'lateral_droit', '2002-07-22'],
  ['Mamadou', 'Magassouba', 'milieu_defensif', '1994-11-29'],
  ['Mathis', 'Royet', 'milieu_defensif', '1998-12-02'],
  ['Martin', 'Mihajlovic', 'milieu_central', '1999-12-12'],
  ['Jordan', 'Radojevic', 'milieu_central', '2001-11-09'],
  ['Simon', 'Cateland', 'milieu_central', '2005-09-30'],
  ['Mouhamadou', 'Singoura', 'ailier_gauche', '1998-06-10'],
  ['Kamel', 'Bennekrouf', 'ailier_droit', '1991-08-27'],
  ['Yahya', 'Soumaré', 'ailier_droit', '2000-06-23'],
  ['Arbion', 'Seferi', 'ailier_droit', '2001-07-26'],
  ['Tristan', 'Bichet', 'attaquant', '2004-07-04'],
  ['Florian', 'Raspentino', 'attaquant', '1989-06-06'],
  ['Marwane', 'Benhmida', 'attaquant', '1995-02-27'],
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
