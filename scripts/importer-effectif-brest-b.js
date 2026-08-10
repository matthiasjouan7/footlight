// Importe l'effectif Stade Brest 29 B (saison 26/27, capture Transfermarkt)
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

const CLUB = 'Stade Brest 29 B';
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
  ['Nando', 'Martinez', 'gardien', '2008-12-14'],
  ['Yanis', 'Ettori', 'defenseur_central', '2008-03-14'],
  ['Kelyan', 'Graziani', 'defenseur_central', '2007-04-18'],
  ['Angelo', 'Bico', 'defenseur_central', '2007-04-08'],
  ['Paul', 'Rivoal', 'defenseur_central', '2008-01-23'],
  ['Davy', 'Tia', 'defenseur_central', '2008-03-12'],
  ['Evan', 'Mailly', 'lateral_gauche', '2007-11-09'],
  ['Nathan', 'Thomas', 'lateral_droit', '2008-01-15'],
  ['Hugo', 'Bourgoin', 'milieu_central', '2007-10-12'],
  ['Sacha', 'Viel', 'milieu_central', '2007-02-13'],
  ['Kenan', 'Moulangou', 'milieu_central', '2007-06-11'],
  ['Axel', 'Lassus', 'milieu_central', '2008-07-07'],
  ['Noa', 'Mokhtari', 'milieu_offensif', '2007-10-09'],
  ['Yannis', 'Rabrun-Nellec', 'milieu_offensif', '2007-09-11'],
  ['Abdoul', 'Samaké', 'ailier_gauche', '2006-02-01'],
  ['Samba', 'Diop', 'ailier_gauche', '2007-05-27'],
  ['Ibrahim', 'Yayiya Kanté', 'ailier_droit', '2007-03-18'],
  ['Yessine', 'Ben Mahmoud', 'ailier_droit', '2008-01-21'],
  ['Mathis', 'Lainé', 'attaquant', '2007-03-30'],
  ['Darri', 'Tifra', 'attaquant', '2007-01-18'],
  ['Enzo', 'Monchatre', 'attaquant', '2008-02-02'],
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
