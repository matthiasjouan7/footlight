// Importe l'effectif US Saint-Philbert-de-Grand-Lieu (saison 26/27, capture
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

const CLUB = 'US Saint-Philbert-de-Grand-Lieu';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

function normalizeName(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}
function slugifyName(s) {
  return normalizeName(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x';
}

// Téo Hamelin (transfert confirmé depuis Dinan Léhon FC N1) et Jordan
// Cuvier (déjà en base sous le nom de club raccourci "Saint Philbert de
// Grand Lieu") sont exclus de NOUVEAUX, traités via CORRECTIONS ci-dessous.
// [prenom, nom, poste, date_naissance ISO]
const NOUVEAUX = [
  ['Marcellin', 'Gohier', 'gardien', '1997-08-05'],
  ['Justin', 'Egron', 'gardien', '2007-03-12'],
  ['Simon', 'Gbegnon', 'defenseur_central', '1992-10-27'],
  ['Yacouba', 'Seydi', 'defenseur_central', '1993-08-13'],
  ['René', 'Kamano', 'defenseur_central', '2001-02-26'],
  ['Nicolas', 'Payot', 'defenseur_central', '1996-07-11'],
  ['Antoine', 'Freuchet', 'defenseur_central', '1996-07-10'],
  ['Quentin', 'Bonnet', 'lateral_gauche', '1990-08-24'],
  ['Kévin', 'Djacko', 'lateral_gauche', '1993-01-31'],
  ['Sammy', "Y'tai", 'lateral_droit', '2000-03-27'],
  ['Maël', 'Ernot', 'lateral_droit', '2001-08-23'],
  ['Julien', 'Olmos', 'milieu_defensif', '2001-09-16'],
  ['Tom', 'Bellanger', 'milieu_defensif', '2000-03-17'],
  ['Sacha', 'Botton', 'milieu_central', '2002-03-23'],
  ['Joris', 'Kenon', 'milieu_offensif', '1998-01-29'],
  ['Corentin', 'Artaillou', 'milieu_offensif', '1998-06-27'],
  ['Abou', 'Konaté', 'milieu_offensif', '2002-01-01'],
  ['Mattéo', 'Evain', 'milieu_offensif', '2004-01-08'],
  ['Moussa', 'Diaby', 'ailier_gauche', '2002-07-05'],
  ['Dorian', 'Blanquet', 'ailier_gauche', '1999-03-22'],
  ['Youssef', 'Souley', 'ailier_gauche', '1997-01-31'],
  ['Mathys', 'Renaud', 'ailier_droit', '2003-03-06'],
  ['Adam', 'Hammoudi', 'milieu_offensif', '2003-02-19'],
  ['Mouhammad', 'Touré', 'attaquant', '2002-06-24'],
];

const CORRECTIONS = [
  { id: '201cc219-6000-4192-b647-fb39793bfb10', prenom: 'Téo', nom: 'Hamelin', poste: 'gardien' },
  { id: 'd3925e36-79c3-4da6-8dd3-c204a585c99f', prenom: 'Jordan', nom: 'Cuvier', poste: 'attaquant' },
];

// Supabase plafonne chaque requête à 1000 lignes (db-max-rows) : au-delà, il
// faut paginer avec .range() sous peine de manquer des doublons situés après
// la 1000e ligne.
let joueurs = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase.from('joueurs').select('id, prenom, nom, club, niveau, poste').range(from, from + 999);
  if (error) { console.error('Erreur lecture joueurs :', error.message); process.exit(1); }
  if (!data || !data.length) break;
  joueurs = joueurs.concat(data);
  if (data.length < 1000) break;
}

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

console.log(`\n${CORRECTIONS.length} correction(s)/transfert(s) à appliquer :`);
for (const c of CORRECTIONS) console.log(`  ${c.prenom} ${c.nom} → club="${CLUB}", niveau="${NIVEAU}", poste="${c.poste}"`);

if (!dryRun) {
  const { error: insErr } = await supabase.from('joueurs').insert(lignes);
  if (insErr) { console.error('Erreur insertion :', insErr.message); process.exit(1); }
  for (const c of CORRECTIONS) {
    const { error: updErr } = await supabase.from('joueurs').update({ club: CLUB, niveau: NIVEAU, poste: c.poste }).eq('id', c.id);
    if (updErr) { console.error(`Erreur mise à jour correction ${c.prenom} ${c.nom} :`, updErr.message); process.exit(1); }
  }
  console.log('\nTerminé.');
} else {
  console.log('\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour appliquer réellement.');
}
