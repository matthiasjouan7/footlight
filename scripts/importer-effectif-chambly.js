// Importe l'effectif FC Chambly Oise (saison 26/27, capture Transfermarkt)
// dans la table joueurs.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);

const supabase = createClient(supabaseUrl, supabaseKey);

const CLUB = 'FC Chambly Oise';
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
  ['Yannick', 'Etile', 'gardien', '2001-03-08'],
  ['Simon', 'Pontdemé', 'gardien', '1988-05-04'],
  ['Sacha', 'Cortes', 'gardien', '2006-07-27'],
  ['Yanis', 'Klitim', 'defenseur_central', '2005-04-14'],
  ['Thibault', 'Jaques', 'defenseur_central', '1988-03-29'],
  ['Andrea', 'Marques', 'defenseur_central', '1997-04-18'],
  ['Ababacar', 'Paye', 'defenseur_central', '1994-06-02'],
  ['Rosario', 'Latouchent', 'lateral_gauche', '1996-03-21'],
  ['Anderson', 'Goncalves', 'lateral_gauche', '1996-11-08'],
  ['Sadia', 'Diakhabi', 'lateral_droit', '2001-10-23'],
  ['Théo', 'Trinker', 'milieu_defensif', '2001-06-20'],
  ['Johan', 'Rotsen', 'milieu_central', '1996-08-11'],
  ['Léon', 'Delpech', 'milieu_central', '2002-08-13'],
  ['Alex', 'Diliberto', 'milieu_central', '2000-10-30'],
  ['Youri', 'Tabet', 'milieu_central', '1999-09-26'],
  ['Kemy', 'Amiche', 'ailier_droit', '2000-12-10'],
  ['Edgar', 'Adam', 'ailier_droit', '2007-02-20'],
  ['Billal', 'Mehadji', 'milieu_gauche', '1999-04-15'],
  ['Esteban', 'Gonçalves', 'milieu_offensif', '1999-10-20'],
  ['Noah', 'Randazzo', 'ailier_droit', '2004-02-05'],
  ['Khalil', 'Gannoun', 'attaquant', '1999-07-13'],
  ['Anthony', 'George', 'attaquant', '1999-01-26'],
];

const lignes = NOUVEAUX.map(([prenom, nom, poste, date_naissance]) => ({
  prenom, nom, poste, club: CLUB, niveau: NIVEAU, saison: SAISON, date_naissance,
  email: `${slugifyName(prenom)}.${slugifyName(nom)}.manuel@scoute.footlight.fr`,
  matchs_joues: 0, buts: 0, badge: 'declaratif', profil_public: false,
}));

console.log(`${lignes.length} nouveau(x) joueur(s) à insérer :`);
for (const l of lignes) console.log(`  ${l.prenom} ${l.nom} | poste=${l.poste} | né(e) le ${l.date_naissance}`);

if (!dryRun) {
  const { error: insErr } = await supabase.from('joueurs').insert(lignes);
  if (insErr) { console.error('Erreur insertion :', insErr.message); process.exit(1); }
  console.log('\nTerminé.');
} else {
  console.log('\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour appliquer réellement.');
}
