// Importe l'effectif ASC Biesheim (saison 26/27, capture Transfermarkt) dans
// la table joueurs. Vérifie les doublons potentiels puis affiche un aperçu
// avant toute écriture.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);

const supabase = createClient(supabaseUrl, supabaseKey);

const CLUB = 'ASC Biesheim';
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
  ['Jérôme', 'Idir', 'gardien', '1993-03-30'],
  ['Hugo', 'Rauch', 'gardien', '2006-01-05'],
  ['Alexis', 'Weber', 'gardien', '2007-09-11'],
  ['Mathis', 'Louiserre', 'defenseur_central', '2000-08-18'],
  ['Nolan', 'Hamard', 'defenseur_central', '2003-04-09'],
  ['Mara', 'Wagué', 'defenseur_central', '1997-03-18'],
  ['Xavier', 'Decroix', 'defenseur_central', '2000-11-22'],
  ['Doel', 'Bonsu', 'lateral_gauche', '2002-05-17'],
  ['Nathan', 'Ramos', 'lateral_gauche', '2003-06-07'],
  ['Thomas', 'Nemouthé', 'lateral_droit', '2001-01-16'],
  ['Mathis', 'Cohade', 'lateral_droit', '2005-05-14'],
  ['Abdoulaye', 'Baradji', 'milieu_defensif', '1999-02-03'],
  ['Louis Valentin', 'Aboua', 'milieu_central', '2005-03-02'],
  ['Elie', 'Maurin', 'milieu_central', '2003-05-16'],
  ['Samuel', 'Yebra', 'milieu_central', '1999-06-21'],
  ['Medhi', 'Kadi', 'milieu_offensif', '1994-09-21'],
  ['Gamaël', 'Dorvil', 'ailier_gauche', '2002-01-18'],
  ['Julien', 'Tell', 'ailier_droit', '2004-12-07'],
  ['Alain', 'Reppert', 'attaquant', '1995-03-20'],
  ['Ansley', 'Panelle', 'attaquant', '2000-06-10'],
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
