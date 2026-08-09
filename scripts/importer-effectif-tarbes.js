// Importe l'effectif Tarbes Pyrénées Football (saison 26/27, capture
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

const CLUB = 'Tarbes Pyrénées Football';
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
  ['Guillaume', 'Lesec', 'gardien', '1995-04-07'],
  ['Christian', 'Marques', 'gardien', '1995-04-24'],
  ['Clément', 'Krzesinski', 'gardien', '2005-02-25'],
  ['Théo', 'Frantz', 'gardien', '2000-09-15'],
  ['Lilian', 'Roume', 'defenseur_central', '2002-03-25'],
  ['Faouzi', 'Benabed', 'defenseur_central', '2003-03-05'],
  ['Maxime', 'Dannfald', 'lateral_gauche', '2002-03-31'],
  ['Ugo', 'Tarbès', 'lateral_droit', '1999-10-08'],
  ['Euclides', 'Sambu Djeme', 'lateral_droit', '2002-11-17'],
  ['Damien', 'Fachan', 'milieu_defensif', '1990-09-30'],
  ['Haoufou', 'Guira', 'milieu_central', '2003-10-26'],
  ['Hugo', 'Garie', 'milieu_defensif', '2004-08-09'],
  ['Alexandre', 'Yokessa', 'milieu_defensif', '2004-11-26'],
  ['Johan', 'Lecornu', 'milieu_central', '2001-02-06'],
  ['Morgan', 'Corredor', 'milieu_central', '2004-08-04'],
  ['Jarrison', 'Gaspar', 'milieu_central', '2000-06-20'],
  ['Léo', 'Ballarin', 'milieu_central', '1998-09-14'],
  ['Yannis', 'Sankoutcha', 'ailier_gauche', '2004-05-17'],
  ['Alexandre', 'Zahi', 'attaquant', '2000-05-16'],
  ['Olivier', 'Cassange', 'attaquant', '2001-08-08'],
  ['Baptiste', 'Favre', 'attaquant', '2001-06-24'],
  ['Giacomo', 'Perez', 'attaquant', '2004-02-21'],
  ['Rémy', 'Péteilh', 'attaquant', '2000-08-22'],
  ['Florent', 'Pointecouteau', 'attaquant', '2001-06-28'],
  ['Thomas', 'Marque', 'attaquant', '2004-02-04'],
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
