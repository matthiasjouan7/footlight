// Importe l'effectif Mâcon 71 (saison 26/27, capture Transfermarkt) dans la
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

const CLUB = 'Mâcon 71';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

function normalizeName(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}
function slugifyName(s) {
  return normalizeName(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x';
}

// Ryan Cherradi est listé "Milieu gauche" sur Transfermarkt, un poste hors
// enum (pas de milieu_gauche dans l'application, retiré récemment) :
// reclassé en ailier_gauche.
// [prenom, nom, poste, date_naissance ISO]
const NOUVEAUX = [
  ['Antoine', 'Philippon', 'gardien', '1989-10-10'],
  ['Anthony', 'Lamonge', 'gardien', '1996-04-04'],
  ['Aly', 'Yirango', 'gardien', '1994-01-04'],
  ['Israël', 'Kinunga Mbala', 'defenseur_central', '2004-07-08'],
  ['Izao', 'Palumbo', 'defenseur_central', '2007-09-29'],
  ['Arnaud', 'Farras', 'defenseur_central', '1992-01-27'],
  ['Yoan', 'Dignan', 'defenseur_central', '2001-04-14'],
  ['Jordan', 'Hebert', 'lateral_gauche', '2003-03-19'],
  ['Étienne', 'Desroches', 'lateral_droit', '1997-04-27'],
  ['Brandon', 'Huard', 'milieu_defensif', '2003-07-15'],
  ['Mohamed', 'Errachidi', 'milieu_central', '2007-07-07'],
  ['Souleymane', 'Diallo', 'milieu_central', '2005-02-12'],
  ['Uygar', 'Barut', 'milieu_central', '1998-12-18'],
  ['Timothée', 'Tauflieb', 'milieu_central', '1992-12-01'],
  ['Ryan', 'Cherradi', 'ailier_gauche', '2005-01-06'],
  ['Beni', 'Sergio', 'milieu_offensif', '2001-07-31'],
  ['Eddine', 'Charid', 'milieu_offensif', '2004-02-06'],
  ['Jacer', 'Jebabli', 'milieu_offensif', '2000-02-05'],
  ['Mathys', 'Saban', 'ailier_gauche', '2002-05-15'],
  ['Madyan', 'Sounni', 'ailier_gauche', '2002-12-23'],
  ['Tailan', 'Matip Ngom', 'attaquant', '2004-09-28'],
  ['Hamza', 'Rachidi', 'attaquant', '2001-04-26'],
  ['Mahlôn', 'Barty', 'attaquant', '1998-11-06'],
  ['Richard', 'Sila', 'attaquant', '1998-01-04'],
  ['Ugo', 'Boivin', 'attaquant', '2002-09-12'],
  ['Yoann', 'Greco', 'attaquant', '2001-01-07'],
  ['Junior', 'Buckman', 'attaquant', '1998-11-28'],
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
