// Importe l'effectif AS Furiani-Agliani (saison 26/27, capture Transfermarkt)
// dans la table joueurs. Aucun doublon détecté au diagnostic préalable :
// tous les joueurs sont de nouveaux profils.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);

const supabase = createClient(supabaseUrl, supabaseKey);

const CLUB = 'AS Furiani-Agliani';
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
  ['Julien', 'Fabri', 'gardien', '1994-02-05'],
  ['Cédric', 'Lunardi', 'gardien', '1998-05-23'],
  ['Jean-Louis', 'Carlotti', 'gardien', '1998-12-26'],
  ['Iwan', 'Zaragoza', 'gardien', '2006-11-14'],
  ['Lilian', 'Chazelle', 'defenseur_central', '2005-01-25'],
  ['Thibault', 'Valéry', 'defenseur_central', '1992-06-01'],
  ['Othman', 'Aankour', 'defenseur_central', '1997-05-04'],
  ['Arnaud', 'Binet', 'defenseur_central', '1996-03-25'],
  ['Diego', 'Fantini', 'lateral_gauche', '2004-08-13'],
  ['Anthony', 'Féliciano', 'lateral_gauche', '1994-02-20'],
  ['Adrien', 'Pianelli', 'lateral_droit', '1995-02-28'],
  ['Leandro', 'Alves', 'lateral_droit', '1998-12-08'],
  ['Christophe', 'Vincent', 'milieu_defensif', '1992-11-08'],
  ['Audran', 'Ruiz', 'milieu_defensif', '2001-07-03'],
  ['Nicolas', 'Casanova', 'milieu_defensif', '2007-06-27'],
  ['Lucas', 'Rigaud', 'milieu_defensif', '1995-05-15'],
  ['Fabio', 'Teixeira Lopes', 'milieu_central', '1995-06-07'],
  ['Marc', 'Jourdan', 'milieu_central', '2001-06-19'],
  ['Mohamed', 'Conté', 'milieu_central', '2001-04-15'],
  ['Ayoub', 'Boukreris', 'milieu_offensif', '2000-11-27'],
  ['Soufiane', 'Nouala', 'milieu_offensif', '1994-06-02'],
  ['Peterson', 'Paul', 'ailier_gauche', '2006-11-05'],
  ['Axel', 'Thoumin', 'ailier_gauche', '2001-12-14'],
  ['Nicolas', 'Bertil', 'ailier_droit', '2004-02-20'],
  ['Gwenn', 'Foulon', 'attaquant', '1998-10-20'],
  ['Sébastien', 'da Silva', 'attaquant', '1991-04-08'],
  ['Eghishe Antonio', 'Prodromou', 'attaquant', '2010-01-05'],
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
