// Importe l'effectif US Feurs (saison 26/27, capture Transfermarkt) dans la
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

const CLUB = 'US Feurs';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

function normalizeName(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}
function slugifyName(s) {
  return normalizeName(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x';
}

// Noa Deschamps listé « Milieu » (générique) sur Transfermarkt → milieu_central (confirmé).
// [prenom, nom, poste, date_naissance ISO]
const NOUVEAUX = [
  ['Melvin', 'Douniama', 'gardien', '2003-02-26'],
  ['Enzo', 'Vita', 'gardien', '2004-05-29'],
  ['Kévin', 'Bolamba Basua', 'gardien', '2007-11-05'],
  ['Amélien', 'Bonnier', 'defenseur_central', '2002-08-15'],
  ['Mohamadou', 'Souaré', 'defenseur_central', '1998-03-09'],
  ['Saliou', 'Thiao', 'defenseur_central', '2001-01-01'],
  ['Yanice', 'Abbou', 'lateral_gauche', '2002-05-15'],
  ['Yanis', 'Touati', 'lateral_gauche', '2004-09-05'],
  ['Prince Sergio', 'Domingos', 'lateral_gauche', '2003-01-20'],
  ['Noa', 'Fiette', 'lateral_droit', '2004-04-23'],
  ['Joe', 'Pinna', 'lateral_droit', '2000-04-26'],
  ['Nathan', 'Lamarche', 'lateral_droit', '2006-01-13'],
  ['Quentin', 'Canales', 'milieu_defensif', '1997-11-26'],
  ['Mathéo', 'Marmorat', 'milieu_defensif', '2004-03-23'],
  ['Noa', 'Deschamps', 'milieu_central', '2001-12-25'],
  ['Ilyes', 'Baghough', 'milieu_central', '1995-08-11'],
  ['Valentin', 'Larue', 'milieu_central', '1994-10-02'],
  ['Yann', 'Carlini', 'milieu_central', '2005-03-14'],
  ['Quentin', 'Stockley', 'ailier_droit', '1997-08-11'],
  ['César', 'Neto', 'milieu_offensif', '1999-02-26'],
  ['Naël', 'Benseddik', 'milieu_offensif', '2002-07-06'],
  ['William', 'Nguea Mandengue', 'ailier_gauche', '2003-05-02'],
  ['Ibrahim', 'Bathily', 'ailier_droit', '2006-07-12'],
  ['Enzo', 'Nenkula', 'ailier_droit', '2004-05-29'],
  ['Bilel', 'Guechi', 'attaquant', '2000-12-28'],
  ['Louis', 'Pama Djobo', 'attaquant', '2005-01-10'],
  ['Idriss', 'Hamdi', 'attaquant', '1998-08-28'],
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
