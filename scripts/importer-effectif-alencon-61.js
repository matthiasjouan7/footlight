// Importe l'effectif US Alençon 61 (saison 26/27, capture Transfermarkt)
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

const CLUB = 'US Alençon 61';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

function normalizeName(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}
function slugifyName(s) {
  return normalizeName(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x';
}

// Ullrich Pereira Souza (transfert confirmé depuis US Saint-Malo N1) est
// exclu de NOUVEAUX, traité via CORRECTIONS ci-dessous.
// [prenom, nom, poste, date_naissance ISO]
const NOUVEAUX = [
  ['Arthur', 'Duval', 'gardien', '1998-11-07'],
  ['Aymeric', 'Potiron', 'gardien', '2005-04-18'],
  ['Joshua', 'Santini', 'gardien', '2008-02-02'],
  ['Karim', 'El Hamdaoui', 'defenseur_central', '1991-09-21'],
  ['Nathan', 'Truet', 'defenseur_central', '2004-03-07'],
  ['Samuel-Bill', 'Kamga', 'defenseur_central', '2000-08-13'],
  ['Edgard', 'Nganga', 'defenseur_central', '1999-09-04'],
  ['Lucas', 'Guéguen', 'defenseur_central', '2007-08-08'],
  ['Joachim', 'Lepage', 'lateral_gauche', '1997-01-05'],
  ['William', 'Dayoro', 'lateral_droit', '1998-11-17'],
  ['Lucas', 'Liger', 'milieu_defensif', '2003-01-08'],
  ['Maxence', 'Agnoly', 'milieu_central', '2005-03-01'],
  ['Shelley', 'Bindika Ndalla', 'milieu_central', '1999-11-05'],
  ['Steve', 'Delacour', 'milieu_offensif', '2001-12-01'],
  ['Thibaud', 'Legrou', 'milieu_offensif', '2006-01-18'],
  ['Lorenzo', 'Guillier', 'milieu_offensif', '2008-08-19'],
  ['Hakim', 'El Hamdaoui', 'attaquant', '1991-09-21'],
  ['Elyass', 'Dhoifirou', 'attaquant', '1997-04-12'],
  ['Loukas', 'Lopes Marques', 'attaquant', '2004-11-26'],
  ['Ayoub', 'Stiouet', 'attaquant', '2007-04-23'],
];

const CORRECTIONS = [
  { id: 'a1f53908-9123-4970-a893-da0b19b2ac85', prenom: 'Ullrich', nom: 'Pereira Souza', poste: 'milieu_central' },
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
