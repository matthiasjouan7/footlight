// Importe l'effectif Lyon - La Duchère (saison 26/27, capture Transfermarkt)
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

const CLUB = 'Lyon - La Duchère';
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
  ['Ismaïla', 'Doucouré', 'gardien', '1997-05-18'],
  ['Alban', 'Rambaud', 'gardien', '2002-11-14'],
  ['Ryad', 'Kralladi', 'defenseur_central', '2008-09-08'],
  ['Romain', 'Thunet', 'defenseur_central', '2000-07-24'],
  ['Yoan', 'Zouma', 'defenseur_central', '1998-05-06'],
  ['Maé', 'Clavel', 'lateral_gauche', '2002-01-23'],
  ['Levy', 'Ndoutoume', 'lateral_gauche', '2003-07-10'],
  ['Samy', 'Achour', 'lateral_droit', '2006-09-03'],
  ['Matthéo', 'Haon', 'lateral_droit', '2004-12-14'],
  ['Romain', 'Antunes', 'milieu_defensif', '2000-07-19'],
  ['Kamal', 'Bafounta', 'milieu_defensif', '2002-01-08'],
  ['Yanis', 'Berrached', 'milieu_defensif', '2002-08-18'],
  ['Malik', 'Peisson', 'milieu_defensif', '2002-08-23'],
  ['Emmanuel', 'Valey', 'milieu_central', '2003-01-11'],
  ['Naïm', 'Dhib', 'milieu_central', '1998-02-28'],
  ['Théo', 'Owono', 'milieu_central', '2002-09-30'],
  ['Rayane', 'Chayebi', 'ailier_droit', '1998-03-19'],
  ['Mehdi', 'Boussaïd', 'milieu_offensif', '1995-12-25'],
  ['Jérémie', 'Laurent', 'milieu_offensif', '2005-01-02'],
  ['Sandro', 'Marcon', 'milieu_offensif', '2002-12-31'],
  ['Farès', 'Farhi', 'milieu_offensif', '2000-08-14'],
  ['Ilan', 'Ihaddadene', 'milieu_offensif', '2005-05-29'],
  ['Karahali', 'Souaré', 'ailier_gauche', '2000-10-15'],
  ['Omar', 'Benyounes', 'ailier_droit', '2000-05-29'],
  ['Sofiane', 'Bourouis-Belle', 'attaquant', '2000-12-26'],
  ['Donald', 'Onana', 'attaquant', '2001-07-10'],
  ['Ismail', 'Mediouna', 'attaquant', '2003-02-21'],
  ['Ilyes', 'Boughanmi', 'attaquant', '2004-08-24'],
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
