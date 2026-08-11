// Importe l'effectif Sologne Football Romorantin 41 (saison 26/27, capture
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

const CLUB = 'Sologne Football Romorantin 41';
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
  ['Adama', 'Wagui', 'gardien', '2002-06-25'],
  ['Adrien', 'Jobelot', 'gardien', '1999-11-23'],
  ['Salah', 'Bouazza', 'defenseur_central', '1999-05-26'],
  ['Mohamed', 'Keita', 'defenseur_central', '2006-08-03'],
  ['Reynald', 'Martial', 'defenseur_central', '2002-07-19'],
  ['Matéo', 'Dos Santos', 'defenseur_central', '2005-07-09'],
  ['Yanis', 'Si Mohammed', 'lateral_gauche', '1996-03-31'],
  ['Ludovic', 'Mendy', 'lateral_droit', '2002-08-18'],
  ['Noa', 'Courtin', 'lateral_droit', '2004-07-20'],
  ['Lin-Osy', 'Matsocota', 'lateral_droit', '2006-04-13'],
  ['Houari', 'Djemel', 'milieu_defensif', '1994-07-29'],
  ['Killian', 'Sanson', 'milieu_central', '1997-06-07'],
  ['Noah', 'Jaurès', 'milieu_central', '2003-01-24'],
  ['Jean-Baptiste', 'Gérard', 'milieu_central', '1994-12-21'],
  ['Paulo', 'Tati Rogeiro', 'milieu_offensif', '1994-05-25'],
  ['Keeliane', 'Leite', 'ailier_gauche', '1998-10-12'],
  ['Sabry', 'Lacaze', 'ailier_gauche', '2001-03-11'],
  ['Bailly', 'Zadi', 'ailier_droit', '1987-12-01'],
  ['Hophni', 'Cher Yandokouzou', 'attaquant', '1997-09-09'],
  ['Alan', 'Chesne', 'attaquant', '1999-06-09'],
  ['Yassine', 'Adam', 'attaquant', '2006-12-24'],
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
