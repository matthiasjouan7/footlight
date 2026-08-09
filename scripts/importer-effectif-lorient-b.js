// Importe l'effectif FC Lorient B (saison 26/27, capture Transfermarkt)
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

const CLUB = 'FC Lorient B';
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
  ['Ilan', 'Pain', 'gardien', '2007-01-03'],
  ['Bahliseny', 'Fofana', 'gardien', '2007-08-04'],
  ['Lucas', 'Leaudais', 'defenseur_central', '2004-09-26'],
  ['Izak', 'Akakpo', 'defenseur_central', '2004-02-28'],
  ['Noam', 'Marchal', 'defenseur_central', '2006-03-20'],
  ['Stevan', 'Siba', 'defenseur_central', '2006-12-31'],
  ['Cyril', 'Borval', 'lateral_gauche', '2005-01-30'],
  ['Noah', 'Le Gal', 'lateral_gauche', '2007-04-23'],
  ['Matis', 'Brault', 'lateral_droit', '2003-12-30'],
  ['Jai', 'Semenyo', 'lateral_droit', '2003-07-13'],
  ['Daniel', 'Semedo', 'milieu_central', '2003-10-25'],
  ['Samba', 'Diop', 'milieu_central', '2006-01-06'],
  ['Sohaib', 'Belarbi', 'milieu_central', '2005-06-15'],
  ['Antton', 'Mouledous', 'ailier_droit', '2007-04-26'],
  ['Martin', 'Bley', 'milieu_offensif', '2006-01-23'],
  ['Mohamed-Anouar', 'Hmamouch', 'milieu_offensif', '2006-07-08'],
  ['Samir', 'Haribou', 'attaquant', '2007-04-18'],
  ['Salah-Dine', 'El Mezouari', 'attaquant', '2004-06-26'],
  ['Mamadou', 'Koné', 'attaquant', '2006-11-20'],
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
