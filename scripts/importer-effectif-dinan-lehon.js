// Importe l'effectif Dinan Léhon FC (saison 26/27, capture Transfermarkt)
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

const CLUB = 'Dinan Léhon FC';
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
  ['Hugo', 'Barbet', 'gardien', '2001-11-22'],
  ['Corentin', 'Guyon', 'gardien', '1995-05-28'],
  ['Mathéo', 'Didot', 'defenseur_central', '2002-04-25'],
  ['Christopher', 'Mendy', 'defenseur_central', '1998-03-27'],
  ['Léo', 'Rouillé', 'lateral_gauche', '2004-02-09'],
  ['Abdoulkader', 'Thiam', 'lateral_gauche', '1998-10-03'],
  ['Martin', 'Le Gendre', 'lateral_gauche', '2006-06-15'],
  ['Hugo', 'Julien', 'lateral_gauche', '2003-04-26'],
  ['Victor', 'Lefebvre', 'lateral_gauche', '1994-08-04'],
  ['James', 'Le Marer', 'lateral_droit', '1991-01-01'],
  ['Alexandre', 'Huot', 'lateral_droit', '1993-03-05'],
  ['Lino', 'Dufouil', 'milieu_defensif', '1998-07-27'],
  ['Hugo', 'Jacquemin', 'milieu_central', '1996-08-18'],
  ['Gabriel', 'Tutu', 'ailier_droit', '2004-01-29'],
  ['Anthony', 'Vermet', 'milieu_offensif', '1993-09-09'],
  ['Ulrick', 'Eneme-Ella', 'attaquant', '2001-05-22'],
  ['Benjamin', 'Guyomard', 'attaquant', '1995-06-30'],
  ['Nathan', 'Le Gouellec', 'attaquant', '2001-09-27'],
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
