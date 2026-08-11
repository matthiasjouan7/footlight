// Importe l'effectif Blois Football 41 (saison 26/27, capture Transfermarkt)
// dans la table joueurs. Vérifie les doublons potentiels puis affiche un
// aperçu avant toute écriture.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);

const supabase = createClient(supabaseUrl, supabaseKey);

const CLUB = 'Blois Football 41';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

function normalizeName(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}
function slugifyName(s) {
  return normalizeName(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x';
}

// Julien Clémandot, Mouctar Diaby et Nicolas Ardouin sont listés "Milieu
// droit" sur Transfermarkt, un poste hors enum (pas de milieu_droit dans
// l'application) : reclassés en ailier_droit, symétrique à la correction
// milieu_gauche -> ailier_gauche appliquée à l'ensemble de la base.
// [prenom, nom, poste, date_naissance ISO]
const NOUVEAUX = [
  ['Dorian', 'Chiotti', 'gardien', '1998-08-16'],
  ['Nicolas', 'Pistol', 'gardien', '1996-08-16'],
  ['Lino', 'Duhamel', 'gardien', '2006-01-12'],
  ['Ewen', 'Le Josse', 'gardien', '2006-02-16'],
  ['Geoffrey', 'Marie-Louise', 'defenseur_central', '1992-01-16'],
  ['Yahaya', 'Médard', 'defenseur_central', '2000-01-14'],
  ['Bryan', 'Debola', 'defenseur_central', '2002-03-25'],
  ['Nathan', 'Bourdin', 'defenseur_central', '2003-09-15'],
  ['Amary', 'Coproh', 'defenseur_central', '2003-03-17'],
  ['Gaylord', 'Kitenge', 'lateral_gauche', '2002-07-27'],
  ['Erkan', 'Yikik', 'lateral_gauche', '1993-03-27'],
  ['Germain', 'Kapela', 'lateral_droit', '2002-05-19'],
  ['Mamadou', 'Traoré', 'lateral_droit', '2002-01-09'],
  ['Guy', 'Tapé', 'milieu_defensif', '1992-05-13'],
  ['Lukas', 'Bonnet', 'milieu_defensif', '2004-08-02'],
  ['Fred', 'Gnalega', 'milieu_central', '2001-10-08'],
  ['Julien', 'Clémandot', 'ailier_droit', '1999-10-20'],
  ['Mouctar', 'Diaby', 'ailier_droit', '2003-06-10'],
  ['Nicolas', 'Ardouin', 'ailier_droit', '2003-02-23'],
  ['Youssef', 'Talbi', 'milieu_offensif', '2004-02-23'],
  ['Dominique', 'Pandor', 'ailier_droit', '1993-05-15'],
  ['Jonathan', "N'Sondé", 'attaquant', '1996-04-16'],
  ['Théo', 'Mothmora', 'attaquant', '2002-03-02'],
  ['Matthis', 'Rambo', 'attaquant', '2000-06-06'],
  ['Michael', 'Nsilu Kuyenga', 'attaquant', '2002-01-04'],
  ['Noa', 'Boisset', 'attaquant', '2005-05-21'],
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
