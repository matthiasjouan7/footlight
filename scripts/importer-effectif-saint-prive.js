// Importe l'effectif Saint-Pryvé Saint-Hilaire FC (saison 26/27, capture
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

const CLUB = 'Saint-Pryvé Saint-Hilaire FC';
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
  ['Enzo', 'Tostivint', 'gardien', '2003-04-25'],
  ['Allan', 'Hunou', 'gardien', '1996-03-24'],
  ['Hugo', 'Bernon', 'gardien', '2000-09-14'],
  ['Joseph', 'Gyeboaho', 'defenseur_central', '1999-12-16'],
  ['Mory', 'Mara', 'defenseur_central', '2000-09-25'],
  ['Lorik', 'Ukaj', 'defenseur_central', '2005-01-03'],
  ['Younesse', 'Sabri', 'defenseur_central', '1997-02-16'],
  ['Grégory', 'Lescot', 'defenseur_central', '1989-05-10'],
  ['Gabriel', 'Osei Yaw', 'defenseur_central', '2000-01-04'],
  ['Diédié', 'Traoré', 'lateral_gauche', '1999-01-15'],
  ['Moussa', 'Kaba', 'lateral_gauche', '2005-07-01'],
  ['Yoann', 'Wachter', 'lateral_droit', '1992-04-07'],
  ['Thomas', 'Colléaux', 'milieu_defensif', '2005-04-18'],
  ['Hugo', 'da Silva', 'milieu_central', '2008-10-05'],
  ['Thibault', 'Lemesle', 'milieu_defensif', '1999-06-06'],
  ['Joan', 'Siber', 'milieu_defensif', '1998-12-21'],
  ['Kenny', 'Mavuba', 'milieu_defensif', '1998-12-07'],
  ['Antoine', 'Bernasque', 'milieu_central', '2001-06-16'],
  ['Raphaël', 'Galas', 'milieu_central', '1997-10-24'],
  ['Yanis', 'Bousseaden', 'milieu_central', '2001-01-22'],
  ['Bryan', 'Locko', 'milieu_offensif', '2002-05-06'],
  ['Wisâm', 'Jedd', 'milieu_offensif', '2001-07-24'],
  ['Carnejy', 'Antoine', 'attaquant', '1991-07-27'],
  ['Mody', 'Doucouré', 'attaquant', '2002-04-14'],
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
