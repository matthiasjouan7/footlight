// Importe l'effectif US Saint-Malo (saison 26/27, capture Transfermarkt)
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

const CLUB = 'US Saint-Malo';
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
  ['Maxime', 'Pattier', 'gardien', '1996-02-12'],
  ['Vivien', 'Tétart', 'lateral_gauche', '1999-03-11'],
  ['Daniel', 'Glao', 'attaquant', '2001-09-14'],
];

// Gabin Olière, Antoine Cottereau, Thibaut Cillard, Tommy Le Verge, Edouard
// Daillet, Tom Duponchelle, Alexandre Leroyer et Sofiane Barroug sont déjà
// en base à US Saint-Malo avec des données correctes : pas de doublon à
// insérer, pas d'action nécessaire.
//
// Corrections/transferts confirmés :
// - Pierre Magnon, Tom Lebeau et Lucas Capoue sont déjà à US Saint-Malo
//   avec un poste dans un ancien format (avec espace) : correction du
//   poste uniquement.
// - Sofiane Hamard et Quentin Le Coz sont déjà en base sous le nom de club
//   raccourci "Saint Malo" (même club, poste déjà correct) : correction du
//   nom de club uniquement.
// - Mamadou Kamissoko (ex-Angoulême Charente FC), Pierre Bardy (ex-Aviron
//   Bayonnais FC) et Tanguy Guérineau (ex-Les Herbiers VF) sont des
//   transferts confirmés vers US Saint-Malo.
const TRANSFERTS = [
  { id: 'db7d26b0-b77d-4a51-8227-f183f83be177', prenom: 'Pierre', nom: 'Magnon', poste: 'milieu_central' },
  { id: 'e1695cb7-4b37-4db1-ab21-7153e8149221', prenom: 'Tom', nom: 'Lebeau', poste: 'milieu_central' },
  { id: '5b11960f-db96-4ac7-a78e-6a03e63943f4', prenom: 'Lucas', nom: 'Capoue', poste: 'ailier_gauche' },
  { id: '27e8f09f-5d57-49e1-b5ce-85be68a0b224', prenom: 'Sofiane', nom: 'Hamard', poste: 'milieu_offensif' },
  { id: '9c28e6f5-5fab-44ad-9ddc-6f60b0f2185b', prenom: 'Quentin', nom: 'Le Coz', poste: 'attaquant' },
  { id: '3e3b43f2-e173-47e9-a456-126426e22a2d', prenom: 'Mamadou', nom: 'Kamissoko', poste: 'defenseur_central' },
  { id: '8cf15cdb-6d6e-43b8-a3c1-7a6cdf244998', prenom: 'Pierre', nom: 'Bardy', poste: 'defenseur_central' },
  { id: '27331342-381b-4f66-b478-84bcabff430d', prenom: 'Tanguy', nom: 'Guérineau', poste: 'ailier_droit' },
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
