// Importe l'effectif Grand Ouest Association Lyonnaise FC (saison 26/27,
// capture Transfermarkt) dans la table joueurs. Vérifie les doublons
// potentiels puis affiche un aperçu avant toute écriture.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);

const supabase = createClient(supabaseUrl, supabaseKey);

const CLUB = 'Grand Ouest Association Lyonnaise FC';
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
  ['Lucas', 'Marsella', 'gardien', '2000-01-11'],
  ['Abdoul', 'Coulibaly', 'gardien', '2001-06-04'],
  ['Thomas', 'Fontaine', 'defenseur_central', '1991-05-08'],
  ['Youssoupha', 'Ndiaye', 'defenseur_central', '1997-10-07'],
  ['Zéphir', 'Bever', 'defenseur_central', '2003-05-06'],
  ['Tiécoro', 'Keita', 'lateral_gauche', '1994-04-13'],
  ['Adrien', 'Darriot', 'lateral_gauche', '2001-11-21'],
  ['Baptiste', 'Dedola', 'lateral_droit', '2001-05-15'],
  ['Loïc', 'Dufau', 'milieu_defensif', '1989-03-15'],
  ['Youssouf', "N'Diaye", 'milieu_defensif', '1995-10-19'],
  ['Hugo', 'Hilt', 'milieu_defensif', '2002-08-31'],
  ['Jordan', 'Da Costa', 'milieu_central', '2002-09-25'],
  ['Hamed', 'Foundikou', 'milieu_central', '2002-10-14'],
  ['Sofiane', 'Bendaoud', 'milieu_central', '1992-08-24'],
  ['Maxime', "D'Arpino", 'milieu_central', '1996-06-17'],
  ['Jonathan', 'Mambu', 'ailier_droit', '1995-07-19'],
  ['Yassin', 'Fekir', 'milieu_offensif', '1997-05-05'],
  ['Ayoub', 'Meftahi', 'milieu_offensif', '2002-12-12'],
  ['Mamadou', 'Diallo', 'ailier_gauche', '1994-09-19'],
  ['Abdelkrim', 'Khaled', 'ailier_gauche', '1999-06-15'],
  ['Aymen', 'Djedid', 'ailier_gauche', '2004-10-31'],
  ['Arthur', 'Mai', 'ailier_droit', '1996-05-17'],
  ['Ottman', 'Dadoune', 'attaquant', '1994-07-26'],
  ['Kévin', 'Da Costa', 'attaquant', '2002-09-25'],
  ['Tigran', 'Khachatryan', 'attaquant', '2005-06-10'],
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
