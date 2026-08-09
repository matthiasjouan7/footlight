// Importe l'effectif Saint-Colomban Locminé (saison 26/27, capture
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

const CLUB = 'Saint-Colomban Locminé';
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
  ['Ibrahima', 'Sy', 'gardien', '1995-08-13'],
  ['Evan', 'Dréau', 'gardien', '1999-02-09'],
  ['Guillaume', 'Jannez', 'defenseur_central', '1989-02-19'],
  ['Baptiste', 'Kerviche', 'defenseur_central', '1999-06-07'],
  ['Alexandre', 'Le Nédic', 'defenseur_central', '1998-03-05'],
  ['Alexandre', 'Lavenant', 'defenseur_central', '1995-03-24'],
  ['Diakari', 'Diarra', 'lateral_gauche', '1993-03-24'],
  ['Lucas', 'Salaun', 'lateral_gauche', '2006-06-30'],
  ['Azaria', 'Obame', 'lateral_gauche', '2000-02-24'],
  ['Benjamin', 'Rio', 'lateral_droit', '1997-02-04'],
  ['Hugo', 'Gerbore', 'milieu_central', '2002-04-29'],
  ['Mathis', 'Belhaj', 'milieu_defensif', '2001-02-08'],
  ['Mario-Jason', 'Kikonda', 'milieu_central', '1996-04-20'],
  ['Mathis', 'Raimbault', 'milieu_central', '2004-09-23'],
  ['Mathys', 'Daubin', 'milieu_central', '2001-06-08'],
  ['Achille', 'Degan', 'milieu_gauche', '1992-09-21'],
  ['Djibril', 'Konté', 'ailier_gauche', '2002-11-04'],
  ['Georges', 'Gope-Fenepej', 'ailier_gauche', '1988-10-23'],
  ['Hamza', 'Bouraja', 'ailier_gauche', '2003-12-26'],
  ['Khaled', 'Mesbah', 'ailier_droit', '2000-09-11'],
  ['Jeffrey', 'Quarshie', 'attaquant', '1991-07-11'],
  ['Steven', 'Le Mouellic', 'attaquant', '2003-12-27'],
  ['Antonin', 'Kermorgant', 'attaquant', '2006-08-03'],
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
