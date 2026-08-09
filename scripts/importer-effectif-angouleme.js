// Importe l'effectif Angoulême Charente FC (saison 26/27, capture
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

const CLUB = 'Angoulême Charente FC';
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
  ['Jason', 'Perian', 'gardien', '2002-06-07'],
  ['Nathan', 'Vitré', 'defenseur_central', '1998-03-03'],
  ['Lorick', 'Cots', 'lateral_gauche', '2003-01-09'],
  ['Evan', 'Vonner', 'milieu_defensif', '2004-09-11'],
  ['Issam', 'Ben Khemis', 'milieu_central', '1996-01-10'],
  ['Léo', 'Fichten', 'milieu_central', '1994-08-26'],
  ['Lilian', 'Fournier', 'ailier_droit', '1998-05-18'],
  ['Kévin', 'Testud', 'ailier_droit', '1992-04-12'],
];

// Salim Jabi est actuellement libre ("Sans club" / niveau "Autre") : on ne
// touche pas à sa fiche, il n'est pas rattaché à Angoulême Charente FC.
//
// Ghjuvanni Quilichini et Théo Montavit sont déjà en base sous "Aviron
// Bayonnais FC" (transfert confirmé vers Angoulême Charente FC).
// Victor Elissalt, Mahamadou Diarra, Paul Meliande et Lucas Makan sont déjà
// en base à Angoulême Charente FC avec un poste à corriger (ancien format ou
// valeur différente, confirmé).
const TRANSFERTS = [
  { id: 'e5846c08-c7d6-435d-ac7d-1b6dad34bbad', prenom: 'Ghjuvanni', nom: 'Quilichini', poste: 'gardien' },
  { id: 'ac9d43c2-1d93-4499-94a0-12f3b318a844', prenom: 'Théo', nom: 'Montavit', poste: 'milieu_defensif' },
  { id: '37253032-e047-4d74-ad41-6d62866a5236', prenom: 'Paul', nom: 'Meliande', poste: 'milieu_central' },
  { id: '1c95714d-25e8-4ade-ba31-20a64143cfdc', prenom: 'Victor', nom: 'Elissalt', poste: 'milieu_central' },
  { id: '13e0c885-7608-4f67-9e3a-ac638a5d29e2', prenom: 'Mahamadou', nom: 'Diarra', poste: 'milieu_central' },
  { id: 'fb6e1ab5-fe87-4727-ab10-dfdfa9368877', prenom: 'Lucas', nom: 'Makan', poste: 'attaquant' },
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
