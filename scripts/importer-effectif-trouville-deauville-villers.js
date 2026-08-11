// Importe l'effectif AS Trouville-Deauville-Villers (saison 26/27, capture
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

const CLUB = 'AS Trouville-Deauville-Villers';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

function normalizeName(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}
function slugifyName(s) {
  return normalizeName(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x';
}

// Ibrahim Doro est déjà en base sous le nom de club raccourci "Deauville"
// (même club que "AS Trouville-Deauville-Villers") : exclu de NOUVEAUX,
// traité via CORRECTIONS ci-dessous (nom de club + poste à corriger).
// [prenom, nom, poste, date_naissance ISO]
const NOUVEAUX = [
  ['Romain', 'Hanquinquant', 'gardien', '1998-11-28'],
  ['Antonin', 'Guillochet', 'gardien', '2007-06-19'],
  ['Yann', 'Amougou', 'gardien', '2001-05-02'],
  ['Robin', 'Lapert', 'defenseur_central', '1997-11-29'],
  ['Enzo', 'Fokam Kamguem', 'defenseur_central', '1999-11-15'],
  ['Mody', 'Fofana', 'defenseur_central', '1994-03-22'],
  ['Fernand', 'Gale', 'defenseur_central', '1994-02-25'],
  ['Djiby', 'Sarr', 'lateral_gauche', '1996-03-20'],
  ['Marius', 'Michel', 'lateral_gauche', '1996-08-29'],
  ['Yannis', "N'Gakoutou", 'lateral_droit', '1998-09-30'],
  ['Jocelyn', 'Sancho', 'lateral_droit', '2000-05-10'],
  ['Hugo', 'Souyris', 'lateral_droit', '2001-09-13'],
  ['Benjamin', 'Capron-Litique', 'milieu_defensif', '2000-10-22'],
  ['Eddy', 'Debreux', 'milieu_defensif', '1995-08-28'],
  ['Jean-Noël', 'Gabriel', 'milieu_defensif', '1997-10-04'],
  ['Yanis', 'Zeghoudi', 'milieu_defensif', '2004-02-06'],
  ['Jovany', 'Correia', 'milieu_central', '2004-09-02'],
  ['Sofiane', 'Abdelkader', 'milieu_gauche', '1997-06-11'],
  ['Kheo', 'Paddy', 'milieu_offensif', '2008-12-02'],
  ['Yannis', 'Ouhammou', 'milieu_offensif', '1996-07-21'],
  ['Pythocles', 'Bazolo', 'attaquant', '1995-04-05'],
  ['Abou', 'Amadou', 'attaquant', '2003-04-30'],
  ['Mathis', 'Moyen', 'attaquant', '2004-08-25'],
];

const CORRECTIONS = [
  { id: 'ba7b3fed-5c15-4238-866e-7071d89c9a71', prenom: 'Ibrahim', nom: 'Doro', poste: 'lateral_gauche' },
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

console.log(`\n${CORRECTIONS.length} correction(s) à appliquer :`);
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
