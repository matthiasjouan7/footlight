// Importe l'effectif Hauts Lyonnais (saison 26/27, capture Transfermarkt)
// dans la table joueurs. Vérifie les doublons potentiels puis affiche un
// aperçu avant toute écriture.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);

const supabase = createClient(supabaseUrl, supabaseKey);

const CLUB = 'Hauts Lyonnais';
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
  ['Isidore', 'Tissot', 'gardien', '1993-11-25'],
  ['Noam', 'Laine', 'gardien', '2004-03-01'],
  ['Loris', 'Cochini', 'gardien', '2003-01-08'],
  ['Léo', 'Lebon', 'defenseur_central', '2004-08-13'],
  ['Noa', 'Benramdane', 'defenseur_central', '2005-01-21'],
  ['Gilali', 'Lebrini', 'defenseur_central', '2006-02-23'],
  ['Jordan', 'Halaïmia', 'defenseur_central', '2000-05-03'],
  ['Clément', 'Cabaton', 'defenseur_central', '1996-06-06'],
  ['Thomas', 'Blot', 'lateral_gauche', '2003-01-20'],
  ['Romain', 'Poncet', 'lateral_gauche', '1997-03-18'],
  ['Alex', 'Hospital', 'lateral_droit', '2004-06-01'],
  ['Nacim', 'El Hassani', 'milieu_defensif', '2000-03-16'],
  ['Victor', 'Vericel', 'milieu_defensif', '2000-03-16'],
  ['Hilal', 'Bouguerra', 'milieu_defensif', '1991-01-05'],
  ['Marwan', 'Boulaghlem', 'milieu_defensif', '2002-01-24'],
  ['Hugo', 'Thizy', 'milieu_defensif', '2000-08-21'],
  ['Gabin', 'Besson', 'milieu_central', '2004-04-21'],
  ['Joris', 'Cottin', 'milieu_central', '1995-08-16'],
  ['Lucas', 'Carvalho', 'milieu_offensif', '2001-03-27'],
  ['Daniel', 'Cohen Agami', 'ailier_droit', '1998-06-06'],
  ['Maxime', 'Fleury', 'attaquant', '1996-06-16'],
  ['Mohamed', 'Boussaïd', 'attaquant', '1991-04-22'],
  ['Adel', 'Belaroussi', 'attaquant', '1994-11-29'],
  ['Brian', 'Feneuil', 'attaquant', '1996-05-27'],
  ['Prince', 'Mombong', 'attaquant', '2004-04-12'],
  ['Samy', 'Messili', 'attaquant', '2001-11-19'],
  ['Aymeric', 'Dumas', 'attaquant', '2001-03-16'],
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
