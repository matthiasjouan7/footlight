// Importe l'effectif Stade Rennais FC B (saison 26/27, capture
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

const CLUB = 'Stade Rennais FC B';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

function normalizeName(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}
function slugifyName(s) {
  return normalizeName(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x';
}

// [prenom, nom, poste, date_naissance ISO]
const NOUVEAUX = [
  ['Ayoub', 'Akabou', 'gardien', '2007-05-25'],
  ['Noé', 'Le Page', 'gardien', '2008-10-20'],
  ['Yaël', 'Thébault', 'defenseur_central', '2007-02-26'],
  ['Isiaka', 'Soukouna', 'defenseur_central', '2006-02-27'],
  ['Ruben', 'Lomet', 'defenseur_central', '2008-08-20'],
  ['Issa', 'Habri', 'lateral_gauche', '2006-01-06'],
  ['Junior', 'Ake', 'lateral_gauche', '2007-03-15'],
  ['Florian', 'Truffert', 'milieu_defensif', '2006-06-05'],
  ['Djibril', 'Diallo', 'milieu_defensif', '2006-06-24'],
  ['Chibuike', 'Ugochukwu', 'milieu_defensif', '2008-07-27'],
  ['Diego', 'Coutadeur', 'milieu_central', '2007-08-21'],
  ['Steeve', 'Mvodo Mvodo', 'milieu_offensif', '2007-03-22'],
  ['Mervin', 'Gbeme', 'milieu_offensif', '2007-04-23'],
  ['Henrick', 'Do Marcolino', 'milieu_offensif', '2006-03-21'],
  ['Melvin', 'Jambry', 'ailier_gauche', '2007-03-25'],
  ['Amadou', 'Diallo', 'ailier_droit', '2006-07-13'],
  ['Steven', 'Gaote', 'ailier_droit', '2008-02-19'],
  ['Mohamed', 'Chebbi', 'ailier_droit', '2008-01-05'],
  ['Kelvin', 'Dongopandji', 'attaquant', '2007-02-19'],
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
