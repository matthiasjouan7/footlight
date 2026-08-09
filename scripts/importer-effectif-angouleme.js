// Importe l'effectif Angoulême Charente FC (saison 26/27, capture
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

const CLUB = 'Angoulême Charente FC';
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
  ['Ghjuvanni', 'Quilichini', 'gardien', '2002-09-01'],
  ['Jason', 'Perian', 'gardien', '2002-06-07'],
  ['Alexis', 'Mignonneaud', 'gardien', '2003-07-31'],
  ['Nathan', 'Vitré', 'defenseur_central', '1998-03-03'],
  ['Mohamed', 'Hamdi', 'defenseur_central', '1993-05-08'],
  ['Lorick', 'Cots', 'lateral_gauche', '2003-01-09'],
  ['Théo', 'Chauvier', 'lateral_droit', '1999-06-26'],
  ['Thomas', 'Dasquet', 'milieu_defensif', '1994-06-03'],
  ['Evan', 'Vonner', 'milieu_defensif', '2004-09-11'],
  ['Théo', 'Montavit', 'milieu_defensif', '1996-06-30'],
  ['Ibrahima', 'Diaby', 'milieu_defensif', '2004-04-23'],
  ['Issam', 'Ben Khemis', 'milieu_central', '1996-01-10'],
  ['Léo', 'Fichten', 'milieu_central', '1994-08-26'],
  ['Paul', 'Meliande', 'milieu_central', '2001-12-20'],
  ['Victor', 'Elissalt', 'milieu_central', '1991-11-23'],
  ['Mahamadou', 'Diarra', 'milieu_central', '1994-03-11'],
  ['Salim', 'Jabi', 'milieu_central', '1999-07-30'],
  ['Lilian', 'Fournier', 'ailier_droit', '1998-05-18'],
  ['Mouhamadou', 'Sacko', 'milieu_offensif', '2004-01-20'],
  ['Kévin', 'Testud', 'ailier_droit', '1992-04-12'],
  ['Lucas', 'Makan', 'attaquant', '2003-08-09'],
  ['Romain', 'Escarpit', 'attaquant', '1998-07-20'],
  ['Anthony', 'Castera', 'attaquant', '1995-08-10'],
  ['Alexy', 'Sénac', 'attaquant', '2003-01-28'],
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
