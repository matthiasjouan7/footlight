// Importe l'effectif FC Rouen 1899 (saison 26/27, capture Transfermarkt)
// dans la table joueurs. Vérifie les doublons potentiels puis affiche un
// aperçu avant toute écriture.
//
// Ce club est justement celui qui causait la fausse ambiguïté avec
// "Quevilly Rouen Métropole" (voir diagnostic-ambiguite-qrm.js et le
// correctif de normalizeClub) : "FC Rouen 1899" produit la signature
// "1899 rouen", bien distincte de "metropole quevilly rouen".
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);

const supabase = createClient(supabaseUrl, supabaseKey);

const CLUB = 'FC Rouen 1899';
const NIVEAU = 'Ligue 3';
const SAISON = '2026-2027';

function normalizeName(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}
function slugifyName(s) {
  return normalizeName(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x';
}

// Postes donnés précisément par la source : "Gardien de but" → gardien,
// "Arrière gauche/droit" → lateral_gauche/droit, "Ailier gauche/droit" →
// ailier_gauche/droit, "Deuxième attaquant"/"Avant-centre" → attaquant.
// [prenom, nom, poste, date_naissance ISO]
const NOUVEAUX = [
  ['Axel', 'Maraval', 'gardien', '1993-10-20'],
  ['Didier', 'Desprez', 'gardien', '1999-03-13'],
  ['Formose', 'Mendy', 'defenseur_central', '1993-10-08'],
  ['Zakary', 'Lamgahez', 'defenseur_central', '2003-04-08'],
  ['Clément', 'Bassin', 'lateral_gauche', '1994-12-11'],
  ['Melvin', 'Borne', 'lateral_gauche', '2005-07-20'],
  ['Jordy', 'Gaspar', 'lateral_droit', '1997-04-23'],
  ['Bakari', 'Camara', 'milieu_defensif', '1994-01-04'],
  ['Amara', 'Touré', 'milieu_defensif', '2004-12-13'],
  ['Marvin', 'Gakpa', 'milieu_central', '1993-11-01'],
  ['Guiry', 'Egny', 'milieu_central', '2002-06-24'],
  ['Noé', 'Sommer', 'milieu_central', '2001-06-07'],
  ['Ibrahima', 'Samoura', 'milieu_offensif', '2004-12-29'],
  ['Issiaka', 'Karamoko', 'ailier_gauche', '2001-07-15'],
  ['Lisandru', 'Tramoni', 'ailier_droit', '2003-04-18'],
  ['Sory', 'Traoré', 'ailier_droit', '2005-03-13'],
  ['Salim', 'Diaby', 'ailier_droit', '2001-04-25'],
  ['Valentin', 'Fuss', 'attaquant', '2000-07-23'],
  ['Malik', 'Tchokounté', 'attaquant', '1988-09-11'],
  ['Joël', 'Viana', 'attaquant', '2002-09-25'],
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
