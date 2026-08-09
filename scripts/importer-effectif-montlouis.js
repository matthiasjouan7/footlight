// Importe l'effectif FC Montlouis (saison 26/27, capture Transfermarkt) dans
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

const CLUB = 'FC Montlouis';
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
  ['Jules', 'Goda', 'gardien', '1989-05-30'],
  ['Léo', 'Tzotzis', 'gardien', '2001-06-22'],
  ['Noah', 'Sourisce', 'gardien', '2006-01-06'],
  ['Djegui', 'Koita', 'defenseur_central', '1999-08-05'],
  ['Alexandre', 'Castro', 'defenseur_central', '1994-04-24'],
  ['Axel', 'Dudoit', 'defenseur_central', '2000-02-19'],
  ['Yannis', 'Boutouil', 'defenseur_central', '1998-06-13'],
  ['Noah', 'Mulumba', 'defenseur_central', '2002-03-05'],
  ['Banfa', 'Fofana', 'lateral_gauche', '2000-12-17'],
  ['Mohammed', 'Berrabah', 'lateral_gauche', '2002-09-11'],
  ['Benoît', 'Cachenaut', 'lateral_droit', '1998-06-03'],
  ['Hugo', 'Vicart', 'lateral_droit', '2002-10-15'],
  ['Baptiste', 'Canelhas-Reiffers', 'milieu_defensif', '2000-05-09'],
  ['Youssouf', 'Diarra', 'milieu_defensif', '2000-10-19'],
  ['Antoine', 'Rebelo', 'milieu_defensif', '2000-08-13'],
  ['Mattys', 'Mallet', 'milieu_central', '2002-09-19'],
  ['Mohamed Yassin', 'Faiz', 'milieu_defensif', '2004-05-10'],
  ['Alexandre', 'Valbon', 'milieu_central', '1999-11-19'],
  ['Ismaël', 'Houmadi', 'ailier_droit', '2003-07-19'],
  ['Caumes', 'Cimetière', 'ailier_droit', '2007-10-22'],
  ['Malcom', 'Nguea', 'attaquant', '2001-06-27'],
  ['Jean', 'Boyer', 'attaquant', '2001-03-11'],
  ['Luigi', 'Rizaldos', 'attaquant', '2005-08-01'],
  ['Aboubacar', 'Diakhaby', 'attaquant', '1996-03-17'],
  ['Morgan', 'Barbier', 'attaquant', '2000-10-11'],
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
