// Importe l'effectif ÉFC Fréjus Saint-Raphaël (saison 26/27, capture
// Transfermarkt) dans la table joueurs. Vérifie les doublons potentiels
// puis affiche un aperçu avant toute écriture.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);

const supabase = createClient(supabaseUrl, supabaseKey);

const CLUB = 'ÉFC Fréjus Saint-Raphaël';
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
  ['Henrique', 'Tavares', 'gardien', '2002-07-29'],
  ['Thomas', 'Navaux', 'gardien', '1994-04-06'],
  ['Vicenzo', 'Bezzina', 'gardien', '1998-06-20'],
  ['Mathis', 'Dijoux', 'gardien', '2005-10-24'],
  ['Yasser', 'Baldé', 'defenseur_central', '1993-01-12'],
  ['Simon', 'Chaveriat', 'defenseur_central', '2005-04-06'],
  ['Tobias', 'Woum Woum', 'defenseur_central', '2001-07-24'],
  ['Belony', 'Dumas', 'defenseur_central', '1989-07-18'],
  ['Julien', 'Mouillon', 'defenseur_central', '1997-03-13'],
  ['Baptiste', 'Ferrand', 'defenseur_central', '2005-11-26'],
  ['Wilcem', 'Alouache', 'defenseur_central', '1994-08-31'],
  ['Alexandre', 'Gameiro', 'lateral_droit', '1999-01-18'],
  ['Erwin', 'Gnahoré', 'lateral_droit', '2001-06-22'],
  ['Karl', 'de Souza', 'lateral_droit', '1998-03-27'],
  ['Cantyn', 'Chastang', 'milieu_defensif', '1998-03-30'],
  ['Mohamed', 'Fadhloun', 'milieu_defensif', '1994-02-16'],
  ['Georges', 'Garnero', 'milieu_central', '2001-04-24'],
  ['Mansour', 'Belarbi', 'milieu_defensif', '1997-02-27'],
  ['Naël', 'Jaby', 'milieu_central', '2001-04-20'],
  ['Brian', 'Chevreuil', 'milieu_central', '1997-02-26'],
  ['Herman', 'Ako', 'milieu_central', '1993-09-08'],
  ['Abdou-Rahmane', 'Thior', 'milieu_central', '2002-03-10'],
  ['Yassine', 'Kich', 'milieu_offensif', '2002-01-29'],
  ['Marcio', 'Teixeira Barbosa', 'milieu_offensif', '2004-02-05'],
  ['Fodé', 'Guirassy', 'ailier_gauche', '1996-01-06'],
  ['Aymeric', 'Kissy', 'ailier_gauche', '2001-06-05'],
  ['Ilyasse', 'Maamar Ben Hadjar', 'ailier_droit', '1997-01-04'],
  ['Kader', "N'Chobi", 'attaquant', '1995-11-17'],
  ['Mickaël', 'Le Bihan', 'attaquant', '1990-05-16'],
  ['Oussama', 'Abdeldjilil', 'attaquant', '1993-06-23'],
  ['Yanis', 'El Khemiri', 'attaquant', '2000-08-02'],
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
