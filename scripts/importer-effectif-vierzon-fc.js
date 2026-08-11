// Importe l'effectif Vierzon Football Club (saison 26/27, capture
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

const CLUB = 'Vierzon Football Club';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

function normalizeName(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}
function slugifyName(s) {
  return normalizeName(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x';
}

// Mattéo Makhabe est déjà en base sous le nom de club raccourci "Vierzon"
// (même club que "Vierzon Football Club"). Fulgency Kimbembé (transfert
// confirmé depuis US Granville N1) et Arthur Fiquet (transfert confirmé
// depuis Les Herbiers VF N1) sont également exclus de NOUVEAUX, traités via
// CORRECTIONS ci-dessous.
// [prenom, nom, poste, date_naissance ISO]
const NOUVEAUX = [
  ['Enzo', 'Pauchet', 'gardien', '1997-03-22'],
  ['Xavier', 'Renard', 'gardien', '1998-06-04'],
  ['Benoît', 'Leroy', 'gardien', '2004-07-12'],
  ['Bastien', 'Guérin', 'gardien', '2005-07-01'],
  ['Noa', 'Tourneur', 'defenseur_central', '2006-12-27'],
  ['Gaël', 'Duport', 'defenseur_central', '2007-11-28'],
  ['Souleymane', 'Diagne', 'defenseur_central', '1992-07-24'],
  ['Enzo', 'Schioppa', 'lateral_droit', '2002-04-29'],
  ['Anli', 'Ahamada', 'lateral_droit', '1994-04-25'],
  ['Baptiste', 'Rocher', 'lateral_droit', '2002-08-01'],
  ['Youssouf', 'Traoré', 'milieu_defensif', '1998-01-06'],
  ['Adel', 'Khechim', 'milieu_central', '1992-08-04'],
  ['Kalvin', 'Paul', 'milieu_central', '2001-07-02'],
  ['Benjamin', 'Duvoux', 'milieu_central', '1995-05-22'],
  ['Saad', 'Trabelsi', 'milieu_offensif', '1991-12-20'],
  ['Nihad', 'Chamouni', 'milieu_offensif', '1999-04-17'],
  ['Enzo', 'Carré', 'milieu_offensif', '2005-05-10'],
  ['Iman', "N'Zete", 'ailier_gauche', '2003-01-30'],
  ['Guevin', 'Tormin', 'ailier_droit', '1997-10-28'],
  ['Soiyir', 'Sanali', 'ailier_droit', '2002-01-20'],
  ['Yanis', 'Atila', 'ailier_droit', '2006-05-30'],
  ['Sean', 'Tormin', 'attaquant', '2004-05-19'],
];

// La fiche existante de Mattéo Makhabe n'a pas de date de naissance : on en
// profite pour la compléter avec celle de la nouvelle capture.
const CORRECTIONS = [
  { id: '5396a6bf-2b47-45ca-bbb9-644d09499d0a', prenom: 'Mattéo', nom: 'Makhabe', poste: 'milieu_offensif', date_naissance: '2003-11-28' },
  { id: 'b9041ec3-c855-4370-812e-d9133619f494', prenom: 'Fulgency', nom: 'Kimbembé', poste: 'milieu_central' },
  { id: '36168eab-8e50-45cc-9137-06237a089e04', prenom: 'Arthur', nom: 'Fiquet', poste: 'attaquant' },
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
    const patch = { club: CLUB, niveau: NIVEAU, poste: c.poste };
    if (c.date_naissance) patch.date_naissance = c.date_naissance;
    const { error: updErr } = await supabase.from('joueurs').update(patch).eq('id', c.id);
    if (updErr) { console.error(`Erreur mise à jour correction ${c.prenom} ${c.nom} :`, updErr.message); process.exit(1); }
  }
  console.log('\nTerminé.');
} else {
  console.log('\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour appliquer réellement.');
}
