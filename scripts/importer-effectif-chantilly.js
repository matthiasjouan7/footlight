// Importe l'effectif US Chantilly (saison 26/27, capture Transfermarkt) dans
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

const CLUB = 'US Chantilly';
const NIVEAU = 'N1';
const SAISON = '2026-2027';

function normalizeName(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}
function slugifyName(s) {
  return normalizeName(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x';
}

// Ilan Ernoux existe déjà en base à US Chantilly (N1, ailier_gauche) : donnée
// déjà correcte, pas de doublon à insérer ni de transfert à appliquer.
// [prenom, nom, poste, date_naissance ISO]
const NOUVEAUX = [
  ['Erwan', 'Drais', 'gardien', '1997-08-08'],
  ['Joris', 'Revault', 'gardien', '2005-06-22'],
  ['Roman', 'Magloire', 'gardien', '2007-07-03'],
  ['Gabriel', 'Dubois', 'defenseur_central', '1996-03-04'],
  ['Souleymane', 'Coulibaly', 'defenseur_central', '1992-08-20'],
  ['Adrien', 'Pagerie', 'lateral_gauche', '1992-05-08'],
  ['Thomas', 'Da Costa', 'lateral_gauche', '1998-03-12'],
  ['Matias', 'Ferreira', 'lateral_droit', '1997-01-01'],
  ['Dylan', 'Nzeza', 'milieu_defensif', '1998-05-26'],
  ['Özkan', 'Cetiner', 'milieu_central', '2000-11-25'],
  ['Alan', 'Issifou', 'milieu_central', '2003-06-09'],
  ['Mouhamed', 'Sadjo', 'milieu_offensif', '2003-02-16'],
  ['Dylan', 'Duquesnes', 'ailier_gauche', '2003-07-18'],
  ['Christopher', 'Boussemart', 'ailier_droit', '1999-01-18'],
  ['Corentin', 'Lemaire', 'attaquant', '1999-05-11'],
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
