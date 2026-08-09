// Importe l'effectif FC Dieppe (saison 26/27, capture Transfermarkt) dans la
// table joueurs. Vérifie les doublons potentiels puis affiche un aperçu avant
// toute écriture.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);

const supabase = createClient(supabaseUrl, supabaseKey);

const CLUB = 'FC Dieppe';
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
  ['Brice', 'Cognard', 'gardien', '1990-04-26'],
  ['Eliot', 'Boudet', 'gardien', '2006-04-19'],
  ['Alan', 'Uriev', 'gardien', '2006-10-01'],
  ['Ianis', 'Polla Boy', 'defenseur_central', '2003-07-28'],
  ['Gaël', 'Gibert', 'defenseur_central', '2000-07-31'],
  ['Allan', 'Eser', 'defenseur_central', '2005-05-11'],
  ['Théo', 'Lefebvre', 'defenseur_central', '2005-02-18'],
  ['Hamza', 'Chahid', 'defenseur_central', '2000-09-23'],
  ['Paul', 'Diomandé', 'defenseur_central', '2006-01-06'],
  ['Batissaninque', 'Mendes', 'defenseur_central', '1994-09-15'],
  ['Ryan', 'Sabry', 'lateral_gauche', '2000-09-01'],
  ['Edgar', 'Delbos', 'lateral_gauche', '2000-05-06'],
  ['Yanis', 'Afkir', 'lateral_droit', '2004-11-17'],
  ['Chris', 'Lybohy', 'milieu_defensif', '1994-04-11'],
  ['Giovanny', 'Lamiaux', 'milieu_defensif', '2003-09-01'],
  ['Mattéo', 'Benigni', 'milieu_central', '2002-02-15'],
  ['Ylane', 'Cherif', 'milieu_central', '2005-11-30'],
  ['Bastien', 'Magniez', 'milieu_central', '2007-06-03'],
  ['Enzo', 'Beuvain', 'milieu_central', '2003-03-02'],
  ['Hervé', 'Malebe', 'milieu_central', '2002-02-11'],
  ['Kylian', 'Sila', 'attaquant', '2002-11-13'],
  ['Yakine', 'Saïd', 'attaquant', '2003-07-03'],
  ['Enzo', 'Pinochi', 'attaquant', '1998-07-08'],
  ['Orhan', 'Sertoglü', 'attaquant', '1996-06-02'],
  ['Nabil', 'Amrane', 'attaquant', '1994-06-28'],
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
