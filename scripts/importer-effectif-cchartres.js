// Importe l'effectif C'Chartres Football (saison 26/27, capture
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

const CLUB = "C'Chartres Football";
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
  ['Pape', 'Barry', 'gardien', '1989-08-03'],
  ['Josué', 'Albert', 'defenseur_central', '1992-01-21'],
  ['Nielsen', 'Luzein', 'defenseur_central', '2003-03-15'],
  ['Ibrahima', 'Traoré', 'defenseur_central', '1988-11-04'],
  ['Abdoulaye', 'Fofana', 'defenseur_central', '1989-08-08'],
  ['Sékou', 'Fofana', 'defenseur_central', '1996-12-12'],
  ['Thomas', 'Skolski', 'lateral_gauche', '1995-08-31'],
  ['Moussa', 'Sylla', 'lateral_droit', '1999-03-15'],
  ['Souleymane', 'Karamoko', 'lateral_droit', '1992-07-29'],
  ['Allan', 'Laurienté', 'lateral_droit', '2003-05-20'],
  ['Lenny', 'Schmitt', 'milieu_defensif', '2003-03-13'],
  ['Zaïnou-Dine', 'Mohamed', 'milieu_defensif', '2000-06-16'],
  ['Lamine', 'Mezouaghi', 'milieu_defensif', '2005-02-04'],
  ['Aurélien', 'Tertereau', 'milieu_offensif', '1991-07-24'],
  ['Nicolas', 'Barthélémy', 'milieu_offensif', '1990-09-07'],
  ['Mathieu', 'Géran', 'ailier_gauche', '1991-10-13'],
  ['Damien', 'Furtado', 'ailier_gauche', '1997-03-08'],
  ['Diego', 'Pineiro', 'ailier_gauche', '2003-02-04'],
  ['Arouna', 'Cissé', 'ailier_gauche', '2006-05-15'],
  ['Souleymane', 'Sawadogo', 'ailier_droit', '1993-01-09'],
  ['Pierre', 'Picot', 'attaquant', '1990-12-11'],
  ["M'Bemba", 'Diakité', 'attaquant', '2003-01-07'],
  ['Timothé', 'Fakhoury', 'attaquant', '2005-03-08'],
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
