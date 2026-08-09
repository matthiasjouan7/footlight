// Importe l'effectif US Granville (saison 26/27, capture Transfermarkt)
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

const CLUB = 'US Granville';
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
  ['Léopold', 'Maitre', 'gardien', '1998-05-07'],
  ['Anthony', 'Herbin', 'gardien', '1999-05-19'],
  ['Romain', 'Herbinière', 'gardien', '2006-06-07'],
  ['Antonin', 'Levassort', 'gardien', '2007-06-14'],
  ['Lassana', 'Diakhaby', 'defenseur_central', '1996-01-01'],
  ['Mathis', 'Lemeray', 'defenseur_central', '2001-09-25'],
  ['Evan', 'Flouzat', 'defenseur_central', '2006-11-22'],
  ['Pierrick', 'Mouniama', 'defenseur_central', '2001-01-21'],
  ['Joshua', 'Curtius', 'defenseur_central', '1996-04-21'],
  ['Théo', 'Emmanuelli', 'lateral_gauche', '2000-01-31'],
  ['Amay', 'Caprice', 'lateral_droit', '2004-08-21'],
  ['Maxence', 'Legentil', 'milieu_defensif', '1999-10-05'],
  ['Cheikh', 'Gueye', 'milieu_defensif', '2001-02-17'],
  ['Allan', 'Ramos', 'milieu_defensif', '1997-12-15'],
  ['Erin', 'Airhiavbere', 'milieu_central', '2004-01-10'],
  ['Tom', 'Lepenant', 'milieu_central', '2005-07-09'],
  ['Félix', 'Ley', 'milieu_offensif', '2001-01-10'],
  ['Noan', 'Geraux', 'milieu_offensif', '2006-03-29'],
  ['Kylian', 'Silvestre', 'ailier_droit', '2002-08-16'],
  ['Nathan', 'Housset', 'attaquant', '2004-11-04'],
  ['Mouhamed', 'Diouf', 'attaquant', '2003-11-26'],
  ['Enzo', 'Misse', 'attaquant', '2005-06-14'],
  ['Mathis', 'Cherchour', 'attaquant', '1999-11-19'],
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
