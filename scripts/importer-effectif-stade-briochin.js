// Importe l'effectif Stade Briochin (saison 26/27, capture Transfermarkt)
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

const CLUB = 'Stade Briochin';
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
  ['Franck', "L'Hostis", 'gardien', '1990-04-03'],
  ['Dialy', 'Ndiaye', 'gardien', '1999-07-04'],
  ['Abdoul', 'Diaby Malick', 'defenseur_central', '2004-10-15'],
  ['Donovan', 'Basset', 'defenseur_central', '2004-01-05'],
  ['Benjamin', 'Angoua', 'defenseur_central', '1986-11-28'],
  ['Florian', 'Beurel', 'milieu_defensif', '1999-12-05'],
  ['Killian', 'Corenthin', 'milieu_central', '2001-02-17'],
  ['Frédéric', 'Loki', 'milieu_central', '2004-06-16'],
  ['Taylor', 'Salibur', 'milieu_central', '1991-10-19'],
  ['Julien', 'Benhaim', 'milieu_gauche', '1996-10-25'],
  ['Karim', 'Achahbar', 'milieu_offensif', '1996-01-03'],
  ['Kemo', 'Kenneh', 'ailier_droit', '1997-04-25'],
  ['Mohamed', 'Mara', 'ailier_droit', '2002-12-02'],
  ['Aimeric', 'Gomis', 'attaquant', '1999-07-14'],
  ['Christian', 'Konan', 'attaquant', '1999-07-12'],
  ['Hicham', 'Benkaid', 'attaquant', '1990-04-26'],
];

// Transferts confirmés : Alexis Taïpa (ex-US Saint-Malo), Damon Bansais
// (ex-US Avranches), Lucas Daury (ex-US Saint-Malo) et Aristide Mateta
// (ex-VFC La Roche-sur-Yon) rejoignent Stade Briochin. On met à jour leur
// profil existant plutôt que d'en créer un doublon.
const TRANSFERTS = [
  { id: '69482492-8317-4b3b-8747-a54c5c0c6af5', prenom: 'Alexis', nom: 'Taïpa', poste: 'lateral_gauche' },
  { id: 'a4493624-6a39-46fa-86fb-2773ce4b5f8c', prenom: 'Damon', nom: 'Bansais', poste: 'lateral_droit' },
  { id: '08a9b996-1f26-47e4-b6e0-143ba8ca7de1', prenom: 'Lucas', nom: 'Daury', poste: 'milieu_offensif' },
  { id: 'a3e8233f-6f69-4396-90db-0762935b8be6', prenom: 'Aristide', nom: 'Mateta', poste: 'ailier_droit' },
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
