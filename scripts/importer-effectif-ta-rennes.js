// Importe l'effectif TA Rennes (saison 26/27, capture Transfermarkt) dans la
// table joueurs. Vérifie les doublons potentiels puis affiche un aperçu
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

const CLUB = 'TA Rennes';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

function normalizeName(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}
function slugifyName(s) {
  return normalizeName(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x';
}

// Corentin Bekhit est déjà en base, déjà au club "TA Rennes" niveau N2,
// poste déjà correct (defenseur_central) : exclu, rien à corriger.
// [prenom, nom, poste, date_naissance ISO]
const NOUVEAUX = [
  ['Hugo', 'Minier', 'gardien', '1997-07-14'],
  ['Alexandre', 'Bouillennec', 'gardien', '1994-10-02'],
  ['Lukas', 'Mary', 'gardien', '2005-02-24'],
  ['Gabin', 'Combaud', 'gardien', '2002-11-29'],
  ['Titouan', 'Le Breton', 'defenseur_central', '2003-11-12'],
  ['Jules', 'Daniel', 'defenseur_central', '2002-08-11'],
  ['Lilian', 'Roudaut', 'defenseur_central', '1998-04-09'],
  ['Mathieu', 'Pothet', 'defenseur_central', '1997-09-14'],
  ['Nassoidillahi', 'Ahamada', 'defenseur_central', '2004-11-01'],
  ['Mathéo', 'Crocq', 'lateral_droit', '2002-01-26'],
  ['Camil', 'Youssoufa', 'lateral_droit', '2004-10-15'],
  ['Franck', 'Héry', 'milieu_defensif', '1993-04-26'],
  ['Henoch', 'Ntafumu', 'milieu_defensif', '1998-04-23'],
  ['Denis-Will', 'Poha', 'milieu_central', '1997-05-28'],
  ['Dylan', 'Biaka', 'milieu_central', '1995-09-22'],
  ['Sofiane', 'Touriss', 'milieu_central', '2002-06-11'],
  ['Rémi', 'Maugain', 'milieu_offensif', '2002-03-30'],
  ['Corentin', 'Lamandé', 'milieu_offensif', '1999-08-10'],
  ['Desty', 'Silunzitisa', 'ailier_gauche', '2002-11-18'],
  ['Alexandre', 'Horveno', 'ailier_gauche', '1994-12-23'],
  ['Brice', 'Tutu', 'attaquant', '1998-01-11'],
  ['Antoine', 'Caroff', 'attaquant', '1993-02-10'],
  ['Thomas', 'Bellier', 'attaquant', '1995-09-01'],
  ['Alexis', 'Poissonneau', 'attaquant', '1998-07-01'],
  ['Iti', 'Koulaté', 'attaquant', '2003-06-30'],
  ['Morgann', 'Le Roux', 'attaquant', '2003-10-06'],
  ['Jhon', 'Balzán Riascos', 'attaquant', '2006-07-12'],
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
