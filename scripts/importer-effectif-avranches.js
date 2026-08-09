// Importe l'effectif US Avranches (saison 26/27, capture Transfermarkt)
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

const CLUB = 'US Avranches';
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
  ['Anthony', 'Beuve', 'gardien', '1988-06-24'],
  ['Hereba', 'Savane', 'defenseur_central', '2005-04-16'],
  ['Bryan', 'Nokoue', 'defenseur_central', '2002-05-23'],
  ['Baye Ablaye', 'Mbaye', 'defenseur_central', '2004-01-12'],
  ['Paul', 'Terrien', 'defenseur_central', '2002-01-17'],
  ['Sasha', 'Delestre', 'defenseur_central', '2006-07-29'],
  ['Aly-Enzo', 'Hamon', 'lateral_gauche', '2003-03-30'],
  ['Zacharie', 'Iscaye', 'lateral_droit', '2000-10-02'],
  ['Emeric', 'Dudouit', 'lateral_droit', '1991-09-07'],
  ['Ethan', 'Cloarec', 'lateral_droit', '2005-06-27'],
  ['Noah', 'Françoise', 'milieu_defensif', '2003-07-05'],
  ['Charles', 'Boateng', 'milieu_defensif', '1989-12-14'],
  ['Jessy', 'Pi', 'milieu_defensif', '1993-09-24'],
  ['Killian', 'Gesmier', 'milieu_central', '2004-04-17'],
  ['Loïs', 'Martins', 'milieu_central', '2004-02-09'],
  ['Ibrahima', 'Doucouré', 'ailier_gauche', '2004-12-25'],
  ['Noah', 'Adekalom', 'ailier_gauche', '2004-01-07'],
  ['Shahin', 'Cissé', 'ailier_gauche', '2004-10-13'],
  ['Anas', 'Lamrabette', 'ailier_droit', '1997-10-06'],
  ['Mehdi', 'Moujetzky', 'attaquant', '2003-11-25'],
  ['Kenny', 'Herbin', 'attaquant', '1996-10-26'],
  ['Ali', 'Dicko', 'attaquant', '2003-08-20'],
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
