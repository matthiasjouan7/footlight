// Importe l'effectif Bourges FC (saison 26/27, capture Transfermarkt) dans
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

const CLUB = 'Bourges FC';
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
  ['Valentin', 'Rabouille', 'gardien', '2000-04-15'],
  ['Loïck', 'Massé', 'gardien', '2003-03-31'],
  ['Dava David', 'Agossa', 'gardien', '2003-05-13'],
  ['Malick', 'Lopy', 'defenseur_central', '1997-05-21'],
  ['Paul', 'Lehoux', 'defenseur_central', '2001-08-21'],
  ['Sekou', 'Traoré', 'defenseur_central', '1997-01-31'],
  ['Emmanuel', 'Latron', 'lateral_gauche', '2000-04-19'],
  ['Florian', 'Ricard', 'lateral_droit', '1998-09-25'],
  ['Nianankoro', 'Doumbia', 'milieu_defensif', '1996-05-23'],
  ['Alexis', 'Mané', 'milieu_defensif', '1997-04-30'],
  ['Mayoro', "N'Doye", 'milieu_defensif', '1991-12-18'],
  ['Brimau', 'Nziengui', 'milieu_defensif', '2001-01-24'],
  ['Ibou', 'Faye', 'milieu_defensif', '1991-09-19'],
  ['Izhak', 'Hammoudi', 'milieu_central', '2004-11-07'],
  ['Mamadou Lamine', 'Massaly', 'milieu_central', '2006-12-31'],
  ['Alpha', 'Sawaneh Kubota', 'ailier_droit', '1996-07-19'],
  ['Maguette', 'Diop', 'ailier_gauche', '2005-06-22'],
  ['Pierre-Bertrand', 'Arné', 'ailier_gauche', '2000-09-30'],
  ['Hamed', 'Belem', 'ailier_droit', '1999-09-24'],
  ['Ali', 'Sghiouari', 'ailier_droit', '2004-02-09'],
  ['Lamine', 'Touré', 'attaquant', '2003-12-20'],
  ['El Hadj', 'Coly', 'attaquant', '2001-07-05'],
  ['Gaëtan', 'Missi Mezu', 'attaquant', '1996-05-04'],
  ['Noah', 'Marchesseau', 'attaquant', '2003-04-13'],
  ['Amadou Sadio', 'Diallo', 'attaquant', '2001-04-22'],
  ['Thomas', 'Gautier', 'attaquant', '2001-07-25'],
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
