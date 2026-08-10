// Importe l'effectif Vannes OC (saison 26/27, capture Transfermarkt) dans la
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

const CLUB = 'Vannes OC';
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
  ['Mattéo', 'Petitgenet', 'gardien', '1997-05-21'],
  ['Romain', 'Le Roch-Daniel', 'gardien', '2006-07-05'],
  ['Thomas', 'Ecalard', 'gardien', '1998-10-02'],
  ['Mathis', 'Guillemot', 'defenseur_central', '2003-06-15'],
  ['Emmanuel', 'Lushima', 'defenseur_central', '1997-11-23'],
  ['Miguel', 'Jacques', 'defenseur_central', '1996-01-25'],
  ['Charly', 'Maintenant', 'lateral_gauche', '1999-09-27'],
  ['Emmanuel', 'Amanakow', 'lateral_gauche', '1997-09-30'],
  ['Matteo', 'Gillmann', 'lateral_gauche', '2005-02-15'],
  ['Baptiste', 'Bourlès', 'milieu_defensif', '2001-12-07'],
  ['Alex Noah', 'Abogo', 'milieu_defensif', '1998-05-20'],
  ['Hugo', 'Le Bolloch', 'milieu_defensif', '2004-01-28'],
  ['Evan', 'Vallot', 'milieu_defensif', '2006-09-12'],
  ['Aurélien', 'Soufaché', 'milieu_offensif', '2000-02-25'],
  ['Kévin', 'Blaecke', 'milieu_offensif', '1998-06-18'],
  ['Ilyes', 'Kallouche', 'milieu_offensif', '2005-02-08'],
  ['Vincent', 'Morhan', 'ailier_gauche', '1999-07-01'],
  ['Exaucé', 'Ngassaki', 'attaquant', '1997-01-30'],
  ['Amaury', 'Le Nouen', 'attaquant', '1995-11-16'],
  ['Erwan', 'Maintenant', 'attaquant', '2002-07-24'],
  ['Mathis', 'Schindler', 'attaquant', '2005-05-25'],
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

if (!dryRun) {
  const { error: insErr } = await supabase.from('joueurs').insert(lignes);
  if (insErr) { console.error('Erreur insertion :', insErr.message); process.exit(1); }
  console.log('\nTerminé.');
} else {
  console.log('\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour appliquer réellement.');
}
