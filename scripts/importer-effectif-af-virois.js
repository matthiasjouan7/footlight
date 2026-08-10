// Importe l'effectif AF Virois (saison 26/27, capture Transfermarkt) dans la
// table joueurs. Vérifie les doublons potentiels puis affiche un aperçu
// avant toute écriture.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);

const supabase = createClient(supabaseUrl, supabaseKey);

const CLUB = 'AF Virois';
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
  ['Louis', 'Deschateaux', 'gardien', '1997-04-16'],
  ['Maël', 'Obé', 'gardien', '2004-09-26'],
  ['Pierre', 'Bourdin', 'defenseur_central', '1994-01-06'],
  ['Alban', 'Gibert', 'defenseur_central', '2000-04-23'],
  ['Hazel', 'Eyaye', 'lateral_gauche', '2006-06-20'],
  ['Benjamin', 'Beaufils', 'lateral_gauche', '2004-05-12'],
  ['Mathias', 'Imbert', 'lateral_gauche', '2004-12-28'],
  ['Oscar', 'Verneau', 'lateral_droit', '2001-09-12'],
  ['Théo', 'Salibur', 'lateral_droit', '2000-04-30'],
  ['Mathéo', 'Gaillard', 'lateral_droit', '2002-08-17'],
  ['Matthias', 'Mathevet', 'milieu_defensif', '2004-02-03'],
  ['Luca', 'Boudonnet', 'milieu_defensif', '2001-01-27'],
  ['Enzo', 'Kowalczyk', 'milieu_gauche', '2002-09-17'],
  ['Dorian', 'Charlier', 'milieu_offensif', '1997-04-18'],
  ['Valentin', 'Aumond', 'milieu_offensif', '1999-06-26'],
  ['Dembo', 'Savane', 'ailier_gauche', '1999-11-09'],
  ['Jordan', 'Perrier', 'ailier_gauche', '1997-05-10'],
  ['Steevy', 'Nogbou', 'attaquant', '2001-04-27'],
  ['Simon', 'Delaunay', 'attaquant', '2001-07-25'],
  ['Lohann', 'Ledos', 'attaquant', '2001-08-09'],
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
