// Importe l'effectif Andrézieux-Bouthéon FC (saison 26/27, capture
// Transfermarkt) dans la table joueurs. Vérifie les doublons potentiels puis
// affiche un aperçu avant toute écriture.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);

const supabase = createClient(supabaseUrl, supabaseKey);

const CLUB = 'Andrézieux-Bouthéon FC';
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
  ['Killian', 'Le Roy', 'gardien', '1998-01-31'],
  ['Axel', 'Jorjet', 'gardien', '2003-01-20'],
  ['Clidis', 'da Silva', 'defenseur_central', '1998-11-14'],
  ['Paul', 'Bentayou', 'defenseur_central', '1999-03-04'],
  ['Maël', 'Yazid', 'defenseur_central', '2001-02-16'],
  ['Malcom', 'Musquet', 'lateral_gauche', '2002-04-15'],
  ['Pierre', 'Nouvel', 'lateral_gauche', '1998-01-10'],
  ['Kylian', 'Le Her', 'lateral_droit', '2002-04-24'],
  ['Ryan', 'Sylva', 'lateral_droit', '2002-09-19'],
  ['Noah', 'Vandenbossche', 'milieu_defensif', '2004-09-07'],
  ['Jérémy', 'Mangonzo', 'milieu_defensif', '1998-02-03'],
  ['Louis', 'Carnot', 'milieu_central', '2001-02-25'],
  ['Maxence', 'Renoud', 'milieu_offensif', '2000-02-08'],
  ['Mickaël', 'Latour', 'milieu_offensif', '1995-09-16'],
  ['Mathéo', 'Remars', 'milieu_offensif', '1999-05-14'],
  ['Tom', 'Meyer', 'milieu_offensif', '2005-08-19'],
  ['Henry', 'Crinacoba', 'ailier_droit', '2004-05-17'],
  ['Yankuba', 'Jarju', 'attaquant', '1996-08-20'],
  ['Mathis', 'Latif', 'attaquant', '2004-05-14'],
  ['Ahmed', 'Traoré', 'attaquant', '2002-05-15'],
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
