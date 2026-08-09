// Importe l'effectif FC Borgo (saison 26/27, capture Transfermarkt) dans la
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

const CLUB = 'FC Borgo';
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
  ['Andrea', 'Scarpitta', 'gardien', '2006-06-12'],
  ['Enzo', 'Garrido', 'gardien', '2003-07-26'],
  ['Raphaël', 'Susini', 'defenseur_central', '2007-06-28'],
  ['Guy-Marcel', 'Bayala', 'defenseur_central', '2003-05-01'],
  ['Fabio', 'Perotto', 'lateral_gauche', '2001-07-31'],
  ['Jérémy', 'Mizrahi', 'lateral_droit', '2000-05-30'],
  ['Alexandre', 'Jourda', 'lateral_droit', '2001-07-15'],
  ['Karim', 'Mohamed', 'lateral_droit', '2001-04-02'],
  ['Julien', 'Prenant-Caporossi', 'lateral_droit', '2006-02-23'],
  ['Paolo', 'Lebas', 'milieu_defensif', '2003-04-20'],
  ['Cherif', 'Doumbia', 'milieu_defensif', '1991-08-19'],
  ['Inza', 'Diarrassouba', 'milieu_defensif', '1990-08-03'],
  ['Éros', 'Esposito', 'milieu_defensif', '2004-03-13'],
  ['Hugo', 'Morales', 'milieu_central', '2001-08-28'],
  ['Valentin', 'Prenant-Caporossi', 'milieu_central', '2006-02-23'],
  ['Charles', 'Vinciguerra', 'milieu_central', '2005-09-22'],
  ['Vinicius', 'Lansade', 'milieu_offensif', '2000-02-12'],
  ['Francescu', 'Barboni', 'milieu_offensif', '2003-11-12'],
  ['Jean-Jacques', 'Rocchi', 'ailier_gauche', '1989-06-01'],
  ['Younès', 'Khedir', 'ailier_gauche', '2002-11-25'],
  ['Walter', 'Collovigh', 'attaquant', '1993-01-29'],
  ['Carlu Antò', 'Savelli', 'attaquant', '2005-04-12'],
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
