// Importe l'effectif Aviron Bayonnais (saison 26/27, capture Transfermarkt)
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

const CLUB = 'Aviron Bayonnais';
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
  ['Charly', 'Jan', 'gardien', '1999-05-27'],
  ['Maxime', 'Debove', 'gardien', '2005-09-09'],
  ['Robin', 'Verhaeghe', 'defenseur_central', '2004-02-02'],
  ['Jonathan', 'Abonckelet', 'defenseur_central', '2002-02-27'],
  ['Mathias', 'Lavenette', 'defenseur_central', '2006-04-29'],
  ['Youssouf', 'Koné', 'lateral_gauche', '1995-07-05'],
  ['Byani', 'Mpata Lama', 'lateral_gauche', '2003-11-05'],
  ['Manech', 'Billy', 'lateral_droit', '2005-11-24'],
  ['Glenn', 'Younousse', 'lateral_droit', '2004-07-17'],
  ['Beimarse', 'Tankiev', 'milieu_defensif', '2002-02-20'],
  ['Charles-Élie', 'Laprevotte', 'milieu_defensif', '1992-10-04'],
  ['Pierre', 'Jouan', 'milieu_central', '2002-04-02'],
  ['Noah', 'Lahmadi', 'milieu_central', '2005-01-05'],
  ['Mario', 'Fortunato', 'milieu_central', '2002-07-02'],
  ['Mehdi', 'Nfati', 'milieu_central', '2005-10-25'],
  ['Noa', 'Savignac', 'ailier_droit', '2002-07-20'],
  ['Tim', 'Rey', 'milieu_offensif', '2003-02-11'],
  ['Nail', 'Kheroua', 'milieu_offensif', '2006-05-27'],
  ['Nohan', 'Traoré', 'ailier_gauche', '2003-06-26'],
  ['Jibril', 'Othman', 'attaquant', '2004-04-26'],
  ['Djibrill', 'Hattab', 'attaquant', '2002-01-12'],
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

if (!dryRun) {
  const { error: insErr } = await supabase.from('joueurs').insert(lignes);
  if (insErr) { console.error('Erreur insertion :', insErr.message); process.exit(1); }
  console.log('\nTerminé.');
} else {
  console.log('\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour appliquer réellement.');
}
