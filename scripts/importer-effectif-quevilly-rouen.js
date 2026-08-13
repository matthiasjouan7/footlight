// Importe l'effectif Quevilly Rouen Métropole (saison 26/27, capture
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

// Le calendrier officiel désigne ce club "QRM" (voir CLUB_SYNONYMES_COMPLETS
// dans footlight-modifier-profil.html) : "Quevilly Rouen Métropole" produit
// exactement les mêmes mots développés, donc le rapprochement se fait par
// signature sans ambiguïté.
const CLUB = 'Quevilly Rouen Métropole';
const NIVEAU = 'Ligue 3';
const SAISON = '2026-2027';

function normalizeName(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}
function slugifyName(s) {
  return normalizeName(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x';
}

// Tous les postes sont donnés précisément par la source (aucun "Milieu"/
// "Défense" générique) : "Arrière gauche/droit" → lateral_gauche/droit
// (latéral), "Avant-centre" → attaquant.
// [prenom, nom, poste, date_naissance ISO]
const NOUVEAUX = [
  ['Mathys', 'Silistrie', 'gardien', '2005-09-16'],
  ['Timothé', 'Viel', 'gardien', '2006-05-19'],
  ['Virgil', 'Thérésin', 'defenseur_central', '1999-01-20'],
  ['Yacine', 'Gaya', 'defenseur_central', '2004-11-15'],
  ['Théo', 'Pionnier', 'defenseur_central', '2002-01-21'],
  ['Schinéar', 'Mopila', 'defenseur_central', '2004-04-11'],
  ['Mathis', 'Hamdi', 'lateral_gauche', '2003-10-18'],
  ['Ewan', 'Hornech', 'lateral_gauche', '2006-01-06'],
  ['Marius', 'Ros', 'lateral_droit', '2001-11-15'],
  ['Youssef', 'Gazzaoui', 'lateral_droit', '1996-06-24'],
  ['Natanaël', 'Bouekou', 'milieu_defensif', '2002-05-10'],
  ['Alassane', 'Diaby', 'milieu_defensif', '1995-01-06'],
  ['Warren', 'Tchimbembé', 'milieu_defensif', '1998-04-21'],
  ['Djibril', 'Sarr', 'milieu_defensif', '2001-10-28'],
  ['Evan', 'Gafour', 'milieu_central', '2006-03-26'],
  ['Samuel', 'Come Ruiz', 'milieu_offensif', '2003-03-06'],
  ['Noah', 'Ndeke', 'ailier_gauche', '2003-05-23'],
  ['Djiby', 'Seck', 'ailier_gauche', '2004-03-07'],
  ['Ricardo', 'Coutinho', 'ailier_gauche', '2006-02-28'],
  ['Junior', 'Burban', 'attaquant', '2000-04-11'],
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

if (!dryRun) {
  const { error: insErr } = await supabase.from('joueurs').insert(lignes);
  if (insErr) { console.error('Erreur insertion :', insErr.message); process.exit(1); }
  console.log('\nTerminé.');
} else {
  console.log('\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour appliquer réellement.');
}
