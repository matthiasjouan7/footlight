// Importe l'effectif US Saint-Malo (saison 26/27, capture Transfermarkt)
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

const CLUB = 'US Saint-Malo';
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
  ['Maxime', 'Pattier', 'gardien', '1996-02-12'],
  ['Gabin', 'Olière', 'gardien', '2003-08-19'],
  ['Mamadou', 'Kamissoko', 'defenseur_central', '1993-04-15'],
  ['Pierre', 'Bardy', 'defenseur_central', '1992-08-27'],
  ['Antoine', 'Cottereau', 'defenseur_central', '1999-06-01'],
  ['Thibaut', 'Cillard', 'defenseur_central', '1995-12-23'],
  ['Tommy', 'Le Verge', 'defenseur_central', '2005-10-28'],
  ['Edouard', 'Daillet', 'defenseur_central', '1992-10-21'],
  ['Tom', 'Duponchelle', 'lateral_gauche', '1996-01-17'],
  ['Vivien', 'Tétart', 'lateral_gauche', '1999-03-11'],
  ['Alexandre', 'Leroyer', 'milieu_defensif', '1996-06-20'],
  ['Pierre', 'Magnon', 'milieu_central', '1996-05-09'],
  ['Tom', 'Lebeau', 'milieu_central', '1998-07-23'],
  ['Sofiane', 'Barroug', 'milieu_offensif', '2001-03-04'],
  ['Sofiane', 'Hamard', 'milieu_offensif', '1997-10-06'],
  ['Lucas', 'Capoue', 'ailier_gauche', '1997-12-06'],
  ['Tanguy', 'Guérineau', 'ailier_droit', '1996-11-01'],
  ['Daniel', 'Glao', 'attaquant', '2001-09-14'],
  ['Quentin', 'Le Coz', 'attaquant', '2005-04-03'],
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
