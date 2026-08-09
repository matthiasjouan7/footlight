// Importe l'effectif GFA Rumilly Vallières (saison 26/27, capture
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

const CLUB = 'GFA Rumilly Vallières';
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
  ['Valentin', 'Baume', 'gardien', '1997-01-25'],
  ['Julien', 'Perez', 'gardien', '1993-12-15'],
  ['Marc', 'Laurent', 'defenseur_central', '1997-12-05'],
  ['Jules', 'Sylvestre-Brac', 'defenseur_central', '1998-08-18'],
  ['Salimou', 'Touré', 'defenseur_central', '1996-04-06'],
  ['El Oihab', 'Abdou', 'defenseur_central', '1998-08-22'],
  ['Jérémy', 'Fejoz', 'defenseur_central', '1994-04-23'],
  ['Nicolas', 'Garby', 'lateral_gauche', '1992-10-31'],
  ['Alexis', 'Matias', 'lateral_gauche', '1995-02-15'],
  ['Jonathan', 'Ruque', 'lateral_droit', '2000-05-22'],
  ['Tom', 'Viard', 'lateral_droit', '1995-03-10'],
  ['Moïse', 'Mbemba', 'milieu_defensif', '2000-03-23'],
  ['Wail', 'Essafiani', 'milieu_defensif', '1999-09-22'],
  ['Yoann', 'Martelat', 'milieu_central', '1997-01-16'],
  ['Cyril', 'Martin-Pichon', 'milieu_central', '1998-01-23'],
  ['Valentin', 'Jacob', 'milieu_offensif', '1994-06-15'],
  ['Quentin', 'Fouley', 'milieu_offensif', '1994-01-04'],
  ['Iroy', 'Eckenfelder', 'ailier_gauche', '2002-04-22'],
  ['Yann', 'Athéba', 'ailier_gauche', '1999-10-22'],
  ['Maxence', 'Fortier', 'ailier_droit', '1999-06-11'],
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
