// Importe l'effectif US Lusitanos Saint-Maur (saison 26/27, capture
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

const CLUB = 'US Lusitanos Saint-Maur';
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
  ['Arsène', 'Courel', 'gardien', '2004-04-20'],
  ['Moussa', 'Diarra', 'defenseur_central', '1993-07-02'],
  ['Lassana', 'Diarra', 'defenseur_central', '1997-06-05'],
  ['Florian', 'Dexet', 'lateral_gauche', '1994-10-16'],
  ['Edwin', 'Elodon', 'lateral_gauche', '1998-01-07'],
  ['Melvyn', 'Doremus', 'lateral_droit', '1996-10-29'],
  ['Fábio', 'Pereira', 'milieu_defensif', '1990-07-27'],
  ['Lucas', 'Valeri', 'milieu_central', '2002-02-20'],
  ['Nicolas', 'Caloiero', 'milieu_central', '2001-12-10'],
  ['Paul', 'Millet', 'milieu_central', '1997-04-23'],
  ['Yanis', 'Mimoun', 'milieu_offensif', '2006-02-20'],
  ['Amine', 'Meftah', 'milieu_offensif', '1993-11-18'],
  ['Evens', 'Joseph', 'ailier_gauche', '1999-07-16'],
  ['Bilal', 'El Hajjam', 'ailier_droit', '1998-02-03'],
  ['Sayon', 'Keita', 'ailier_droit', '1992-06-24'],
  ['Gaël', 'Nsombi', 'attaquant', '2003-01-25'],
  ['Abdel Nour', 'Bouhenni', 'attaquant', '1998-09-03'],
  ['Malick', 'Sambou', 'attaquant', '1999-02-14'],
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
