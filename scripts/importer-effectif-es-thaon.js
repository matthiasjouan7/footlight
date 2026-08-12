// Importe l'effectif ES Thaon (saison 26/27, capture Transfermarkt) dans la
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

const CLUB = 'ES Thaon';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

function normalizeName(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}
function slugifyName(s) {
  return normalizeName(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x';
}

// Marouane Fatmi et Baptiste Sadak listés « Milieu » (générique) sur
// Transfermarkt → milieu_central (confirmé pour les deux).
// [prenom, nom, poste, date_naissance ISO]
const NOUVEAUX = [
  ['Raphaël', 'Rodriguez', 'gardien', '1990-02-08'],
  ['Lou', 'Alexandre', 'gardien', '2005-12-17'],
  ['Wilfried', 'Röther', 'defenseur_central', '1990-09-20'],
  ['Tom', 'Condi', 'defenseur_central', '2001-05-13'],
  ['Antonio', 'Haag', 'defenseur_central', '2001-06-11'],
  ['Antoine', 'Claudot', 'defenseur_central', '2001-04-20'],
  ['Amine', 'Hafiane', 'defenseur_central', '2005-12-03'],
  ['Alexandre', 'Leroy', 'lateral_gauche', '1999-05-27'],
  ['Raphaël', 'Casi', 'lateral_gauche', '2004-05-11'],
  ['Souleymane', 'Sangaré', 'lateral_droit', '1994-02-03'],
  ['Diego', 'Alves', 'lateral_droit', '1997-03-06'],
  ['Abdoulaye', 'Niang', 'milieu_defensif', '1998-01-13'],
  ['Marouane', 'Fatmi', 'milieu_central', '2005-12-02'],
  ['Baptiste', 'Sadak', 'milieu_central', '2000-08-17'],
  ['Mattéo', 'Evangelisti', 'milieu_central', '2005-05-09'],
  ['Matt', 'Condi', 'milieu_central', '2003-07-08'],
  ['Loris', 'Petitpain', 'ailier_droit', '2001-12-13'],
  ['Pierrick', 'Benier', 'milieu_offensif', '1996-10-09'],
  ['Théo', 'Florentin', 'milieu_offensif', '2003-07-05'],
  ['Noah', 'Pesin', 'milieu_offensif', '2004-12-08'],
  ['Anis', 'Oumeddour', 'milieu_offensif', '2002-03-24'],
  ['Pierre-Ange', 'Omombé', 'ailier_gauche', '1995-03-09'],
  ['Hugo', 'Crouzier', 'attaquant', '2000-10-09'],
  ['Mohamed', 'Comara', 'attaquant', '1991-08-07'],
  ['Moctar', 'Tembely', 'attaquant', '2006-04-08'],
  ['Thibaut', 'Barbason', 'attaquant', '2004-08-01'],
];

const CORRECTIONS = [];

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
  const matches = (joueurs || []).filter((j) => normalizeName(j.prenom) === np && normalizeName(j.nom) === nn);
  for (const match of matches) {
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
