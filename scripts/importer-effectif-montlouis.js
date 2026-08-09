// Importe l'effectif FC Montlouis (saison 26/27, capture Transfermarkt) dans
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

const CLUB = 'FC Montlouis';
const NIVEAU = 'N1';
const SAISON = '2026-2027';

function normalizeName(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}
function slugifyName(s) {
  return normalizeName(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x';
}

// [prenom, nom, poste, date_naissance ISO]
const NOUVEAUX = [
  ['Léo', 'Tzotzis', 'gardien', '2001-06-22'],
  ['Axel', 'Dudoit', 'defenseur_central', '2000-02-19'],
  ['Banfa', 'Fofana', 'lateral_gauche', '2000-12-17'],
  ['Hugo', 'Vicart', 'lateral_droit', '2002-10-15'],
  ['Baptiste', 'Canelhas-Reiffers', 'milieu_defensif', '2000-05-09'],
  ['Mohamed Yassin', 'Faiz', 'milieu_defensif', '2004-05-10'],
  ['Alexandre', 'Valbon', 'milieu_central', '1999-11-19'],
  ['Caumes', 'Cimetière', 'ailier_droit', '2007-10-22'],
  ['Malcom', 'Nguea', 'attaquant', '2001-06-27'],
  ['Jean', 'Boyer', 'attaquant', '2001-03-11'],
  ['Aboubacar', 'Diakhaby', 'attaquant', '1996-03-17'],
];

// Doublons confirmés déjà à FC Montlouis avec des données correctes (Jules
// Goda, Noah Sourisce, Alexandre Castro, Yannis Boutouil, Noah Mulumba,
// Mohammed Berrabah, Antoine Rebelo, Morgan Barbier) : simplement absents de
// NOUVEAUX, aucune action nécessaire.
//
// Corrections de données (même club, petite incohérence) + transferts
// confirmés : mise à jour du profil existant plutôt qu'un doublon.
const TRANSFERTS = [
  { id: 'f7821bf3-38ca-4221-8305-41091904e277', prenom: 'Djegui', nom: 'Koita', poste: 'defenseur_central' },
  { id: 'f25b3d41-5305-4954-8f99-7aa5fe941b78', prenom: 'Mattys', nom: 'Mallet', poste: 'milieu_central' },
  { id: '5f32f095-0faf-4ad4-bfe1-117702bde626', prenom: 'Benoît', nom: 'Cachenaut', poste: 'lateral_droit' },
  { id: 'fd351db1-6168-407c-8397-8f2df430804d', prenom: 'Youssouf', nom: 'Diarra', poste: 'milieu_defensif' },
  { id: '25983116-e9a6-4790-8e6d-55f5acc88e06', prenom: 'Ismaël', nom: 'Houmadi', poste: 'ailier_droit' },
  { id: 'dedf99b7-6720-4090-885e-720519d7f66e', prenom: 'Luigi', nom: 'Rizaldos', poste: 'attaquant' },
];

const { data: joueurs, error: jErr } = await supabase.from('joueurs').select('id, prenom, nom, club, niveau, poste');
if (jErr) { console.error('Erreur lecture joueurs :', jErr.message); process.exit(1); }

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

console.log(`\n${TRANSFERTS.length} mise(s) à jour à appliquer :`);
for (const t of TRANSFERTS) console.log(`  ${t.prenom} ${t.nom} → club="${CLUB}", niveau="${NIVEAU}", poste="${t.poste}"`);

if (!dryRun) {
  const { error: insErr } = await supabase.from('joueurs').insert(lignes);
  if (insErr) { console.error('Erreur insertion :', insErr.message); process.exit(1); }
  for (const t of TRANSFERTS) {
    const { error: updErr } = await supabase.from('joueurs').update({ club: CLUB, niveau: NIVEAU, poste: t.poste }).eq('id', t.id);
    if (updErr) { console.error(`Erreur mise à jour ${t.prenom} ${t.nom} :`, updErr.message); process.exit(1); }
  }
  console.log('\nTerminé.');
} else {
  console.log('\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour appliquer réellement.');
}
