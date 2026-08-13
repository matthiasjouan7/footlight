// Importe l'effectif Bourg-en-Bresse Péronnas 01 (saison 26/27, capture
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

const CLUB = 'Bourg-en-Bresse Péronnas 01';
const NIVEAU = 'Ligue 3';
const SAISON = '2026-2027';

function normalizeName(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}
function slugifyName(s) {
  return normalizeName(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x';
}

// Tous les postes sont donnés précisément par la source (aucun "Milieu"/
// "Défense" générique) : "Arrière gauche/droit" → lateral_gauche/droit
// (latéral), "Avant-centre" → attaquant.
// [prenom, nom, poste, date_naissance ISO]
const NOUVEAUX = [
  ['Lenny', 'Montfort', 'gardien', '2002-01-16'],
  ['Arthur', 'Mazuy', 'gardien', '2002-09-14'],
  ['Pierre', 'Popp', 'gardien', '2000-03-27'],
  ['Quentin', 'Lacour', 'defenseur_central', '1993-08-27'],
  ['Romain', 'Muro', 'defenseur_central', '2005-06-03'],
  ['Adam', 'Dihad', 'defenseur_central', '2003-03-01'],
  ['Noah', 'Dede-Lhomme', 'defenseur_central', '2006-07-10'],
  ['Aymen', 'Sabri', 'defenseur_central', '2006-03-05'],
  ['Victor', 'Lebas', 'lateral_gauche', '2004-09-14'],
  ['Esteban', 'Alberto', 'lateral_gauche', '2005-08-06'],
  ['Youssouf', 'Kanouté', 'lateral_droit', '2004-03-18'],
  ['Grégory', 'Coelho', 'lateral_droit', '1999-09-02'],
  ['Rayan', 'Souici', 'milieu_defensif', '1998-02-28'],
  ['Tom', 'Frayssinous', 'milieu_defensif', '2003-01-20'],
  ['Mathéo', 'Tyburn', 'milieu_defensif', '2005-07-03'],
  ['Tom', 'Gomes', 'milieu_central', '2004-03-03'],
  ['Alvin', 'Krizoua', 'milieu_central', '2005-08-25'],
  ['Mounir', 'El Hajjami', 'milieu_offensif', '2003-06-25'],
  ['Yassine', 'Abraou', 'milieu_offensif', '2007-04-19'],
  ['Zola', 'Oniesim', 'milieu_offensif', '2003-10-19'],
  ['Exaucé', 'Mpembele Boula', 'ailier_gauche', '2002-05-15'],
  ['Mahmoud', 'El Wakil', 'ailier_gauche', '2002-05-15'],
  ['Amine', 'Groune', 'ailier_droit', '1997-09-05'],
  ['Ikauar', 'Mendes', 'attaquant', '1999-07-05'],
  ['Aness', 'Gharbi', 'attaquant', '2002-06-21'],
];

// Supabase plafonne chaque requête à 1000 lignes (db-max-rows) : au-delà, il
// faut paginer avec .range() sous peine de manquer des doublons situés après
// la 1000e ligne.
let joueurs = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase.from('joueurs').select('id, prenom, nom, club, niveau, poste').range(from, from + 999);
  if (error) { console.error('Erreur lecture joueurs :', error.message); process.exit(1); }
  if (!data || !data.length) break;
  joueurs = joueurs.concat(data);
  if (data.length < 1000) break;
}

let doublons = 0;
for (const [prenom, nom] of NOUVEAUX) {
  const np = normalizeName(prenom), nn = normalizeName(nom);
  const matches = (joueurs || []).filter((j) => normalizeName(j.prenom) === np && normalizeName(j.nom) === nn);
  for (const match of matches) {
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
