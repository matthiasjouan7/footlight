// Importe l'effectif Racing Besançon (saison 26/27, capture Transfermarkt)
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

const CLUB = 'Racing Besançon';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

function normalizeName(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}
function slugifyName(s) {
  return normalizeName(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x';
}

// Théo Louis (transfert confirmé depuis Stade Poitevin FC N1) est exclu de
// NOUVEAUX, traité via CORRECTIONS ci-dessous.
// [prenom, nom, poste, date_naissance ISO]
const NOUVEAUX = [
  ['Safwan', 'Mbaé', 'defenseur_central', '1997-04-20'],
  ['Maramadou', 'Kaba', 'defenseur_central', '2003-08-24'],
  ['Zaid', 'Herradi', 'defenseur_central', '2004-12-28'],
  ['Maka', 'Gakou', 'lateral_gauche', '2000-03-17'],
  ['Kalpi', 'Ouattara', 'lateral_gauche', '1998-12-29'],
  ['Maxence', 'Verquin', 'lateral_gauche', '2004-10-16'],
  ['Bruno', 'Sambo', 'lateral_droit', '1996-03-24'],
  ['Roman', 'Minary', 'milieu_defensif', '2006-05-01'],
  ['Olivier', 'Girard', 'milieu_defensif', '2008-06-16'],
  ['Samuel', 'Robert', 'milieu_central', '1998-01-12'],
  ['Marjolain', 'Zoumboi', 'milieu_central', '1996-03-01'],
  ['Kevin', 'Hoggas', 'milieu_offensif', '1991-11-16'],
  ['Mattéo', 'Fenollar', 'ailier_droit', '2002-11-29'],
  ['Victor', 'Tilliez', 'attaquant', '2004-02-04'],
  ['Dariel', 'Bernal', 'attaquant', '1999-04-22'],
  ['Ychann', 'Theresine', 'attaquant', '2003-11-06'],
  ['Rolys', "N'Ganzi", 'attaquant', '2003-01-07'],
];

const CORRECTIONS = [
  { id: '1c823cab-e8c6-4c97-9ad5-f5c264ef06d6', prenom: 'Théo', nom: 'Louis', poste: 'gardien' },
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
