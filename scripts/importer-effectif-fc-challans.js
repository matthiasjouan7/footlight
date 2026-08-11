// Importe l'effectif FC Challans (saison 26/27, capture Transfermarkt) dans
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

const CLUB = 'FC Challans';
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
  ['Isaia', 'Hubert', 'gardien', '2002-08-17'],
  ['Nolhan', 'Praud Meunier', 'gardien', '2007-04-20'],
  ['Valentin', 'Miroux', 'defenseur_central', '1998-02-12'],
  ['Tom', 'Fillaudeau', 'defenseur_central', '2002-03-08'],
  ['Alex', 'Merceron', 'lateral_gauche', '1997-07-01'],
  ['Clément', 'Chotard', 'lateral_gauche', '2005-02-08'],
  ['Hugo', 'Connan', 'lateral_droit', '1993-08-04'],
  ['Jonas', 'Charpentier', 'lateral_droit', '1996-02-23'],
  ['Timothée', 'Férand', 'milieu_defensif', '1991-02-11'],
  ['Mathis', 'Clerval', 'milieu_defensif', '2004-10-08'],
  ['Zakaria', 'Boutelioua', 'milieu_defensif', '2007-01-25'],
  ['Hermann', 'Josué', 'milieu_central', '1992-07-08'],
  ['Marc-Antoine', 'Porcher', 'milieu_central', '1998-01-28'],
  ['Donovan', 'Delgado', 'milieu_central', '1999-05-28'],
  ['Valentin', 'Rémy', 'milieu_offensif', '1999-10-23'],
  ['Landry', 'Niaoré', 'ailier_gauche', '1995-03-15'],
  ['Mouhsine', 'Fadil', 'ailier_gauche', '2003-10-24'],
  ['Rodney', 'Mazikou', 'attaquant', '1999-09-19'],
  ['Marthy', 'Guillossou', 'attaquant', '2001-01-26'],
  ['Ousmane', 'Soumah', 'attaquant', '2002-02-12'],
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
