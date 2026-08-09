// Importe l'effectif Vendée Les Herbiers Football (saison 26/27, capture
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

const CLUB = 'Vendée Les Herbiers Football';
const NIVEAU = 'N1';
const SAISON = '2026-2027';

function normalizeName(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}
function slugifyName(s) {
  return normalizeName(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x';
}

// [prenom, nom, poste, date_naissance ISO ou null]
const NOUVEAUX = [
  ['Enzo', 'Sautereau', 'gardien', '2006-01-06'],
  ['Bastien', 'Rempp', 'gardien', '1998-11-11'],
  ['Moussa', 'Grange', 'defenseur_central', '2005-01-20'],
  ['Mathieu', 'Tahmouch', 'defenseur_central', '2003-07-29'],
  ['Antoine', 'Lepeltier', 'defenseur_central', '2005-10-05'],
  ['Alexandre', 'Tégar', 'lateral_gauche', '2000-08-12'],
  ['Loïc', 'Breton', 'lateral_gauche', '2004-05-20'],
  ['Redha', 'Fresneau', 'lateral_droit', '1998-09-21'],
  ['Jack', 'Rissonga', 'lateral_droit', '1996-02-22'],
  ['Madiba', 'Gassama', 'lateral_droit', '2005-04-26'],
  ['Sony', 'Butrot', 'milieu_defensif', '1998-10-06'],
  ['Benjamin', 'Brélivet', 'milieu_defensif', '1992-04-25'],
  ['Hugo', 'Bretagne', 'milieu_defensif', '2002-02-01'],
  ['Titouan', 'Nihouarn', 'milieu_offensif', '2004-07-28'],
  ['Guillaume', 'Yenoussi', 'ailier_gauche', '1997-06-02'],
  ['Damani', 'Touré', 'ailier_droit', '2001-07-26'],
  ['Joe-Loïc', 'Affamah', 'attaquant', '2002-06-29'],
  ['Jérémy', 'Billy', 'attaquant', '1994-01-28'],
  ['Sidy', 'Keita', 'attaquant', '2007-02-10'],
  ['Léo', 'Vincent', 'attaquant', null],
  ['Mamadou', 'Sacko', 'attaquant', '2005-04-06'],
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
for (const l of lignes) console.log(`  ${l.prenom} ${l.nom} | poste=${l.poste} | né(e) le ${l.date_naissance || 'inconnu'}`);

if (!dryRun) {
  const { error: insErr } = await supabase.from('joueurs').insert(lignes);
  if (insErr) { console.error('Erreur insertion :', insErr.message); process.exit(1); }
  console.log('\nTerminé.');
} else {
  console.log('\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour appliquer réellement.');
}
