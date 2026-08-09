// Importe l'effectif Saint-Colomban Locminé (saison 26/27, capture
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

const CLUB = 'Saint-Colomban Locminé';
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
  ['Guillaume', 'Jannez', 'defenseur_central', '1989-02-19'],
  ['Baptiste', 'Kerviche', 'defenseur_central', '1999-06-07'],
  ['Lucas', 'Salaun', 'lateral_gauche', '2006-06-30'],
  ['Hugo', 'Gerbore', 'milieu_central', '2002-04-29'],
  ['Mathis', 'Raimbault', 'milieu_central', '2004-09-23'],
  ['Djibril', 'Konté', 'ailier_gauche', '2002-11-04'],
  ['Hamza', 'Bouraja', 'ailier_gauche', '2003-12-26'],
  ['Khaled', 'Mesbah', 'ailier_droit', '2000-09-11'],
  ['Steven', 'Le Mouellic', 'attaquant', '2003-12-27'],
  ['Antonin', 'Kermorgant', 'attaquant', '2006-08-03'],
];

// Ibrahima Sy, Evan Dréau, Alexandre Le Nédic, Alexandre Lavenant, Azaria
// Obame, Benjamin Rio, Mathis Belhaj, Achille Degan et Jeffrey Quarshie sont
// déjà en base à Saint-Colomban Locminé avec des données correctes : pas de
// doublon à insérer, pas d'action nécessaire.
//
// Corrections/transfert confirmés :
// - Mario-Jason Kikonda et Mathys Daubin sont déjà à Saint-Colomban Locminé
//   avec un poste dans un ancien format ("milieu central", avec espace) :
//   correction du poste uniquement.
// - Georges Gope-Fenepej est déjà à Saint-Colomban Locminé avec un poste
//   dans un ancien format ("ailier gauche", avec espace) : correction du
//   poste uniquement.
// - Diakari Diarra (ex-US Granville) est un transfert confirmé vers
//   Saint-Colomban Locminé.
const TRANSFERTS = [
  { id: '31e4bf75-5507-43a1-acfc-c94fde6e56f9', prenom: 'Mario-Jason', nom: 'Kikonda', poste: 'milieu_central' },
  { id: 'ff4b65d8-e0e6-46cb-9769-746d534b6ce3', prenom: 'Mathys', nom: 'Daubin', poste: 'milieu_central' },
  { id: '6ed47125-ad46-403b-809a-161a5a719697', prenom: 'Georges', nom: 'Gope-Fenepej', poste: 'ailier_gauche' },
  { id: '17c67b54-3a48-4684-b0ab-69f73574afe0', prenom: 'Diakari', nom: 'Diarra', poste: 'lateral_gauche' },
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

console.log(`\n${TRANSFERTS.length} transfert(s)/correction(s) à appliquer :`);
for (const t of TRANSFERTS) console.log(`  ${t.prenom} ${t.nom} → club="${CLUB}", niveau="${NIVEAU}", poste="${t.poste}"`);

if (!dryRun) {
  const { error: insErr } = await supabase.from('joueurs').insert(lignes);
  if (insErr) { console.error('Erreur insertion :', insErr.message); process.exit(1); }
  for (const t of TRANSFERTS) {
    const { error: updErr } = await supabase.from('joueurs').update({ club: CLUB, niveau: NIVEAU, poste: t.poste }).eq('id', t.id);
    if (updErr) { console.error(`Erreur mise à jour transfert ${t.prenom} ${t.nom} :`, updErr.message); process.exit(1); }
  }
  console.log('\nTerminé.');
} else {
  console.log('\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour appliquer réellement.');
}
