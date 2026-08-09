// Importe l'effectif Dinan Léhon FC (saison 26/27, capture Transfermarkt)
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

const CLUB = 'Dinan Léhon FC';
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
  ['Hugo', 'Barbet', 'gardien', '2001-11-22'],
  ['Léo', 'Rouillé', 'lateral_gauche', '2004-02-09'],
  ['Gabriel', 'Tutu', 'ailier_droit', '2004-01-29'],
  ['Benjamin', 'Guyomard', 'attaquant', '1995-06-30'],
];

// Corentin Guyon, Christopher Mendy, Abdoulkader Thiam, Hugo Julien, Victor
// Lefebvre, James Le Marer, Alexandre Huot, Lino Dufouil, Anthony Vermet et
// Ulrick Eneme-Ella sont déjà en base à Dinan Léhon FC avec des données
// correctes : pas de doublon à insérer, pas d'action nécessaire.
//
// Corrections/transferts confirmés :
// - Mathéo Didot est déjà en base sous le nom de club raccourci "DINAN LEHON
//   FC" (même club) : correction du nom de club uniquement, le poste
//   "milieu_central" est conservé tel quel.
// - Hugo Jacquemin est déjà à Dinan Léhon FC avec un poste dans un ancien
//   format ("milieu central", avec espace) : correction du poste uniquement.
// - Martin Le Gendre (ex-US Avranches) et Nathan Le Gouellec (ex-Saint-
//   Colomban Locminé) sont des transferts confirmés vers Dinan Léhon FC.
const TRANSFERTS = [
  { id: 'de9c0e3f-a148-4043-affe-d40ea12236ea', prenom: 'Mathéo', nom: 'Didot', poste: 'milieu_central' },
  { id: '8b57df17-4dbd-4d7c-8fb1-3c57b57faa89', prenom: 'Hugo', nom: 'Jacquemin', poste: 'milieu_central' },
  { id: '9084ee98-be08-49a1-932d-d1972e660b43', prenom: 'Martin', nom: 'Le Gendre', poste: 'lateral_gauche' },
  { id: '5ee2b348-32e8-470f-8017-b40abd4a820d', prenom: 'Nathan', nom: 'Le Gouellec', poste: 'attaquant' },
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
