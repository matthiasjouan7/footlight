// Importe l'effectif Racing Club de France (saison 26/27, capture
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

const CLUB = 'Racing Club de France';
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
  ['Vivien', 'Cédille', 'gardien', '1994-10-08'],
  ['Mickaël', 'Leroy', 'gardien', '2008-10-13'],
  ['Yohan', 'Somme', 'defenseur_central', '1995-06-22'],
  ['Simon', 'Calancha', 'lateral_gauche', '1999-07-18'],
  ['Christopher', 'Maes', 'lateral_gauche', '2001-09-02'],
  ['Kylian', 'Baroudi', 'lateral_droit', '2001-01-14'],
  ['Sabri', 'Daouadji', 'lateral_droit', '2000-09-02'],
  ['Ahmed', 'Ibrahimi', 'milieu_defensif', '1993-01-02'],
  ['Reda', 'Kaddouri', 'milieu_defensif', '1996-03-24'],
  ['Axel', 'Robert', 'milieu_central', '2001-11-06'],
  ['Kenny', 'Fahrasmane', 'milieu_central', '2000-09-30'],
  ['Khalil', 'Msa', 'milieu_offensif', '2004-02-22'],
  ['Rayan', 'Forsa', 'milieu_offensif', '2005-08-25'],
  ['Idriss', 'Fares', 'ailier_gauche', '2002-02-23'],
  ['Noé', 'Clergé', 'ailier_gauche', '2004-05-07'],
  ['Cheickné', 'Samassa', 'ailier_gauche', '1997-07-25'],
  ['Bafodé', 'Daramy', 'ailier_droit', '1998-05-01'],
  ['Elton', 'Wumba', 'ailier_droit', '2001-03-24'],
  ['Damien', 'Mayaya', 'attaquant', '2003-05-11'],
  ['Alban', 'Bekombo', 'attaquant', '1999-07-04'],
  ['Elyon', 'Foungala', 'attaquant', '2004-12-10'],
  ['Mohamed Saïd', 'Camara', 'attaquant', '2004-06-17'],
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
