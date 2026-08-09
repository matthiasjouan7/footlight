// Importe l'effectif LB Châteauroux (saison 26/27, capture Transfermarkt)
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

const CLUB = 'LB Châteauroux';
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
  ['Sébastien', 'Rénot', 'gardien', '1989-11-11'],
  ['Romane', 'Legrand', 'gardien', '1998-11-05'],
  ['Djibril', 'Diarra', 'defenseur_central', '1991-12-14'],
  ['Yannick', "M'Bone", 'defenseur_central', '1993-04-16'],
  ['Bakary', 'Diawara', 'defenseur_central', '2003-09-01'],
  ['Levy', 'Akpes', 'defenseur_central', '2006-08-05'],
  ['Tristan', 'Grippon', 'lateral_gauche', '2000-09-25'],
  ['Jad', 'Koembo', 'lateral_droit', '2004-01-21'],
  ['Amine', 'Badirou', 'lateral_droit', '2007-04-11'],
  ['Yanis', 'Chahid', 'milieu_defensif', '2004-09-18'],
  ['Romain', 'Caumet', 'milieu_defensif', '1999-04-13'],
  ['Kaman', 'Diarra', 'milieu_defensif', '2006-03-31'],
  ['Samba', 'Dembélé', 'milieu_central', '1996-06-09'],
  ['Aymeric', 'Ahmed', 'milieu_offensif', '2003-11-08'],
  ['Julien', 'Charpentier', 'milieu_offensif', '1996-07-17'],
  ['Bakary', 'Sako', 'ailier_gauche', '1988-04-26'],
  ['Jonathan', 'Lavri', 'ailier_gauche', '2002-04-10'],
  ['Anddrys', 'Solvet', 'ailier_gauche', '2007-06-23'],
  ['Berni', 'Kassy', 'ailier_droit', '2006-04-04'],
  ['Noah', 'Bongo', 'attaquant', '1999-02-18'],
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
