// Importe l'effectif Vendée Les Herbiers Football (saison 26/27, capture
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

const CLUB = 'Les Herbiers VF';
const NIVEAU = 'N1';
const SAISON = '2026-2027';

function normalizeName(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}
function slugifyName(s) {
  return normalizeName(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x';
}

// [prenom, nom, poste, date_naissance ISO ou null]
const NOUVEAUX = [
  ['Enzo', 'Sautereau', 'gardien', '2006-01-06'],
  ['Moussa', 'Grange', 'defenseur_central', '2005-01-20'],
  ['Mathieu', 'Tahmouch', 'defenseur_central', '2003-07-29'],
  ['Antoine', 'Lepeltier', 'defenseur_central', '2005-10-05'],
  ['Hugo', 'Bretagne', 'milieu_defensif', '2002-02-01'],
  ['Titouan', 'Nihouarn', 'milieu_offensif', '2004-07-28'],
  ['Guillaume', 'Yenoussi', 'ailier_gauche', '1997-06-02'],
  ['Léo', 'Vincent', 'attaquant', null],
];

// Bastien Rempp, Alexandre Tégar, Loïc Breton, Redha Fresneau, Jack
// Rissonga, Madiba Gassama, Sony Butrot, Benjamin Brélivet, Jérémy Billy et
// Mamadou Sacko sont déjà en base sous le nom de club raccourci "Les
// Herbiers VF" (même club, poste déjà correct) : correction du nom de club
// uniquement.
//
// Damani Touré (ex-Dinan Léhon FC, poste dans un ancien format "ailier
// droit" à corriger), Joe-Loïc Affamah (ex-Angoulême Charente FC) et Sidy
// Keita (ex-VFC La Roche-sur-Yon) sont des transferts confirmés vers Les
// Herbiers VF.
const TRANSFERTS = [
  { id: 'c01dc71c-9de9-44db-ba34-c1b34d03ccf9', prenom: 'Bastien', nom: 'Rempp', poste: 'gardien' },
  { id: '6c719a94-2751-46f9-8893-857d12320b43', prenom: 'Alexandre', nom: 'Tégar', poste: 'lateral_gauche' },
  { id: '59ae394b-8a18-45f1-952c-c96f600b0cff', prenom: 'Loïc', nom: 'Breton', poste: 'lateral_gauche' },
  { id: '7c237fb1-f000-4095-8592-eec607762723', prenom: 'Redha', nom: 'Fresneau', poste: 'lateral_droit' },
  { id: '01d3a447-0de9-479b-98f8-e52d5870f078', prenom: 'Jack', nom: 'Rissonga', poste: 'lateral_droit' },
  { id: 'f67dca69-fd4a-4d0e-b95e-ff3ef242be32', prenom: 'Madiba', nom: 'Gassama', poste: 'lateral_droit' },
  { id: 'ee355abf-bbe2-4c11-bf2f-8f4262aacad8', prenom: 'Sony', nom: 'Butrot', poste: 'milieu_defensif' },
  { id: 'b3b0ce1a-37a8-4b0f-968d-880e7d27a75e', prenom: 'Benjamin', nom: 'Brélivet', poste: 'milieu_defensif' },
  { id: 'dc23d604-590c-42c3-9fb3-0963848baf43', prenom: 'Damani', nom: 'Touré', poste: 'ailier_droit' },
  { id: '94cf5016-7d68-49bd-a07d-dfc123affc65', prenom: 'Joe-Loïc', nom: 'Affamah', poste: 'attaquant' },
  { id: '3cc651a4-948d-4bbf-8d93-273845e3e04e', prenom: 'Jérémy', nom: 'Billy', poste: 'attaquant' },
  { id: '2c5d670b-9b6f-4aab-aa61-41d1fc1aa2ba', prenom: 'Sidy', nom: 'Keita', poste: 'attaquant' },
  { id: 'f4686a4c-2a28-4e5e-8546-5b43db0afeb8', prenom: 'Mamadou', nom: 'Sacko', poste: 'attaquant' },
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
for (const l of lignes) console.log(`  ${l.prenom} ${l.nom} | poste=${l.poste} | né(e) le ${l.date_naissance || 'inconnu'}`);

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
