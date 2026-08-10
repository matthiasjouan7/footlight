// Importe l'effectif AS Vitré (saison 26/27, capture Transfermarkt) dans la
// table joueurs. Vérifie les doublons potentiels puis affiche un aperçu
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

const CLUB = 'AS Vitré';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

function normalizeName(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}
function slugifyName(s) {
  return normalizeName(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x';
}

// [prenom, nom, poste, date_naissance ISO]
const NOUVEAUX = [
  ['Pierre-Alexis', 'Barbé', 'gardien', '1995-04-27'],
  ['Axel', 'Beraud', 'gardien', '2002-12-31'],
  ['Cacharel', 'Kashale', 'defenseur_central', '1997-02-04'],
  ['Matéo', 'Beaudouin', 'defenseur_central', '2003-01-04'],
  ['Eliot', 'Lefeuvre', 'lateral_gauche', '2007-08-01'],
  ['Ewen', 'Le Cunff', 'lateral_droit', '2000-06-02'],
  ['Kevin', 'Tapoko', 'milieu_defensif', '1994-04-13'],
  ['Malo', 'Lemétayer', 'milieu_central', '1998-01-08'],
  ['Pierre', 'Pommereul', 'milieu_central', '2001-01-16'],
  ['Kévin', 'Amourette', 'milieu_central', '1993-12-29'],
  ['Jordan', 'Lebacle', 'milieu_gauche', '1992-08-17'],
  ['Émilien', 'Waflart', 'milieu_offensif', '2001-06-16'],
  ['Romain', 'Emmanuel', 'milieu_offensif', '1999-02-18'],
  ['Glenn', 'Le Gall', 'ailier_gauche', '1995-08-22'],
  ['Noham', 'Bensoula', 'ailier_gauche', '2003-09-12'],
  ['Alban', 'Dupa', 'attaquant', '1998-04-28'],
  ['Théo', 'Marion', 'attaquant', '2001-07-05'],
  ['Zinedine', 'Belomri', 'attaquant', '2005-01-21'],
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
