// Importe l'effectif SR Colmar (saison 26/27, capture Transfermarkt) dans la
// table joueurs. Vérifie les doublons potentiels puis affiche un aperçu avant
// toute écriture.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);

const supabase = createClient(supabaseUrl, supabaseKey);

const CLUB = 'SR Colmar';
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
  ['Alexandre', 'Nagor', 'gardien', '1996-08-23'],
  ['Lucas', 'Royes', 'gardien', '1996-11-13'],
  ['Naël', 'Tyrner', 'gardien', '2007-02-05'],
  ['Ali', 'Bamba', 'defenseur_central', '1991-07-02'],
  ['Datoumcaroul', 'Dole', 'defenseur_central', '2001-09-15'],
  ['Canarie', 'Unjanqui', 'defenseur_central', '1999-04-28'],
  ['Morgan', 'Moasary', 'defenseur_central', '2006-12-15'],
  ['Niels', 'Chirao', 'lateral_droit', '2006-01-18'],
  ['Ousmane', 'Stephanus', 'lateral_droit', '2002-04-12'],
  ['Ibrahim', 'Mohamed', 'milieu_defensif', '1998-11-07'],
  ['Sébastien', 'Chéré', 'milieu_central', '1986-12-23'],
  ['Korab', 'Rashiti', 'milieu_central', '2003-11-27'],
  ['Benjamin', 'Le Galloudec', 'milieu_central', '2004-05-31'],
  ['Marwan', 'Sabri', 'ailier_droit', '2002-01-20'],
  ['Guillaume', 'Jacquat', 'ailier_droit', '1996-12-22'],
  ['Virgile', 'Piechocki', 'milieu_offensif', '1997-01-12'],
  ['Kelvin', 'Winstersheim', 'milieu_offensif', '2005-01-14'],
  ['Frank', 'Makang', 'ailier_gauche', '1997-06-27'],
  ['Désiré', 'Sègbè', 'attaquant', '1993-05-06'],
  ['Espérance', 'Mabekondiasson', 'attaquant', '2003-03-22'],
  ['Ryan', 'Owusu', 'attaquant', '2006-03-27'],
];

// Transfert confirmé : Angel Marchegay (id connu, ex-Stade Poitevin FC)
// rejoint Colmar. On met à jour son profil existant plutôt que d'en créer
// un doublon.
const TRANSFERTS = [
  { id: '661e3fa0-6987-4df5-8cf1-c18e45f71ddd', prenom: 'Angel', nom: 'Marchegay', poste: 'lateral_gauche' },
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

console.log(`\n${TRANSFERTS.length} transfert(s) à appliquer :`);
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
