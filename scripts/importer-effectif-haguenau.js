// Importe l'effectif FR Haguenau (saison 26/27, capture Transfermarkt) dans
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

const CLUB = 'FR Haguenau';
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
  ['Marvin', 'Golitin', 'gardien', '1999-12-18'],
  ['Marco', 'Giagnorio', 'gardien', '2001-05-02'],
  ['Nathan', 'Tronchet', 'defenseur_central', '2004-06-22'],
  ['Jérémie', 'Branca', 'defenseur_central', '2001-01-13'],
  ['Souleymane', 'Faye', 'defenseur_central', '2002-03-29'],
  ['Hamza', 'Salhi', 'defenseur_central', '1994-11-17'],
  ['Daoud', 'Doucouré', 'defenseur_central', '2001-05-24'],
  ['Roldi', 'Tchikamboud', 'defenseur_central', '2006-12-07'],
  ['Christopher', 'Shiashia', 'lateral_gauche', '1996-06-26'],
  ['Léon', 'Munich', 'lateral_gauche', '2001-04-03'],
  ['Nathan', 'Deheppe', 'lateral_gauche', '2003-07-10'],
  ['Brunnel', 'Tutuana', 'lateral_droit', '2004-08-24'],
  ['Romain', 'Metzger', 'lateral_droit', '1996-06-29'],
  ['Maxime', 'Nonnenmacher', 'milieu_defensif', '2002-07-23'],
  ['Nazir', 'Correia', 'milieu_defensif', '2001-07-02'],
  ['Erwann', 'Madihi', 'milieu_central', '1994-06-02'],
  ['Quentin', 'Bur', 'milieu_offensif', '1995-03-30'],
  ['Nicolas', 'Hintenoch', 'milieu_offensif', '2000-01-10'],
  ['Noah', 'Schuler', 'milieu_offensif', '2005-01-16'],
  ['Charlie', 'Dagneaux', 'ailier_gauche', '2007-05-07'],
  ['Amine', 'Mazroui', 'ailier_gauche', '2006-10-19'],
  ['Boubakar', 'Camara', 'ailier_droit', '2001-03-27'],
  ['Eldji', 'Dia', 'attaquant', '2002-08-15'],
  ['Damien', 'Stegmann', 'attaquant', '2006-02-22'],
  ['Benjamin', 'Camolli', 'attaquant', '2007-04-16'],
  ['Brayan', 'Beaumont', 'attaquant', '2003-06-30'],
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
