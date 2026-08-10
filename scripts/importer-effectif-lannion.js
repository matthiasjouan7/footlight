// Importe l'effectif Lannion Football Club (saison 26/27, capture
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

const CLUB = 'Lannion Football Club';
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
  ['Antoine', 'Le Goas', 'gardien', '2002-09-25'],
  ['Baptiste', 'Davaï', 'gardien', '2001-10-29'],
  ['Walid', 'Tanine', 'gardien', '2002-05-06'],
  ['Ylias', 'Ollivier', 'defenseur_central', '2006-01-19'],
  ['Quentin', 'Tamic', 'defenseur_central', '2007-08-22'],
  ['Félix', 'Menn', 'defenseur_central', '1997-01-23'],
  ['Ylan', 'Cefbert', 'defenseur_central', '2003-09-08'],
  ['Florian', 'Kerger', 'lateral_gauche', '1991-01-01'],
  ['Enzo', 'Herpe', 'lateral_gauche', '2004-12-01'],
  ['Alexandre', 'Normand', 'lateral_droit', '1999-01-21'],
  ['Marius', 'Poncel', 'lateral_droit', '2007-02-19'],
  ['Alexi', 'Boucaud', 'lateral_droit', '2003-01-03'],
  ['Maxen', 'Kapo', 'milieu_defensif', '2001-01-19'],
  ['Mattéo', 'Morin', 'milieu_defensif', '2002-05-31'],
  ['Romain', 'Le Méhauté', 'milieu_central', '1997-10-02'],
  ['Sullyan', 'Poha', 'milieu_central', '2004-05-22'],
  ['Paul', 'Houlbert', 'milieu_central', '2006-06-17'],
  ['Romain', 'Carron', 'milieu_offensif', '2002-08-19'],
  ['Louka', 'Morin', 'milieu_offensif', '2002-05-21'],
  ['Steve', 'Devaux', 'ailier_gauche', '1995-02-17'],
  ['Théo', 'Boucaud', 'ailier_droit', '2003-01-03'],
  ['Mewan', 'Le Bonniec', 'attaquant', '2003-07-11'],
  ['Benoît', 'Alagapin', 'attaquant', '2004-01-19'],
  ['Aristide', 'Bureau', 'attaquant', '2001-06-30'],
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
