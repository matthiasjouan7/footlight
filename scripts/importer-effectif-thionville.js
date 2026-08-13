// Importe l'effectif US Thionville Lusitanos (saison 26/27, capture
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

const CLUB = 'US Thionville Lusitanos';
const NIVEAU = 'Ligue 3';
const SAISON = '2026-2027';

function normalizeName(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}
function slugifyName(s) {
  return normalizeName(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x';
}

// Postes donnés par la source : "Gardien de but" → gardien, "Arrière
// gauche/droit" → lateral_gauche/droit, "Milieu droit" (pas d'équivalent
// exact dans l'énumération de l'app) → ailier_droit, comme "Ailier
// droit"/"gauche" pour les autres, "Deuxième attaquant"/"Avant-centre" →
// attaquant.
// [prenom, nom, poste, date_naissance ISO]
const NOUVEAUX = [
  ['Wilfried', 'Bedfian', 'gardien', '2001-07-09'],
  ['Antonin', 'Parisot', 'gardien', '2001-07-28'],
  ['Lyes', 'Hoël', 'gardien', '2007-04-12'],
  ['Muamer', 'Aljic', 'defenseur_central', '2000-06-19'],
  ['Cachito', 'Wanduka', 'defenseur_central', '1992-02-21'],
  ['Samir', 'Bouzar', 'defenseur_central', '1999-08-16'],
  ['Marly', 'Rampont', 'defenseur_central', '2000-11-05'],
  ['Bourama', 'Diarra', 'lateral_gauche', '2000-01-15'],
  ['Victor', 'Siat', 'lateral_gauche', '2006-03-22'],
  ['Bridges', 'Loumouamou', 'lateral_gauche', '1998-03-01'],
  ['David', 'Luvualu', 'lateral_droit', '1996-10-19'],
  ['Joseph', 'Atangana', 'milieu_defensif', '2003-02-26'],
  ['Enzo', 'Montet', 'milieu_defensif', '2003-05-10'],
  ['Jérémy', 'Lauratet', 'milieu_defensif', '1992-06-25'],
  ['Samed', 'Kılıç', 'milieu_central', '1996-01-28'],
  ['Gauthier', 'Laurens', 'ailier_droit', '2000-07-28'],
  // Jalil Moustaid déjà en base (même club/niveau/poste) : non réinséré.
  ['Fadel', 'Gobitaka', 'ailier_gauche', '1998-01-16'],
  ['Kylian', 'Tubio', 'ailier_droit', '2002-04-18'],
  ['Bryan', 'Labissiere', 'attaquant', '1997-02-11'],
  ['Simon', 'Kalambayi', 'attaquant', '2005-02-20'],
  ['Karim', 'Bouhmidi', 'attaquant', '1998-05-26'],
  ['Alexis', 'Gouletquer', 'attaquant', '1999-07-13'],
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
