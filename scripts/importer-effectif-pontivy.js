// Importe l'effectif GSI Pontivy (saison 26/27, capture Transfermarkt) dans
// la table joueurs. Vérifie les doublons potentiels puis affiche un aperçu
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

const CLUB = 'GSI Pontivy';
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
  ['Kévin', 'Le Corvaisier', 'gardien', '1999-09-14'],
  ['Malick', 'Sogue', 'gardien', '2006-09-03'],
  ['Calvin', 'Mangan', 'defenseur_central', '1992-09-23'],
  ['Yoann', 'Le Gal', 'defenseur_central', '1999-08-08'],
  ['Tom', 'Clémence', 'defenseur_central', '2001-11-28'],
  ['Antoine', 'Le Callonnec', 'defenseur_central', '2000-01-21'],
  ['Madigoundo', 'Diakité', 'lateral_gauche', '1994-04-17'],
  ['Stéphan', 'Welsh', 'lateral_gauche', '1994-06-16'],
  ['Louis', 'Tirco', 'lateral_gauche', '2003-01-09'],
  ['Emric', 'Amayota', 'lateral_gauche', '2002-03-24'],
  ['Léo', 'Faure', 'lateral_droit', '2001-03-14'],
  ['Malo', 'Jestin', 'lateral_droit', '2005-01-15'],
  ['Franklin', 'Wadja', 'milieu_defensif', '1995-05-01'],
  ['Malo', 'Jegat', 'milieu_defensif', '2003-01-06'],
  ['Kilian', 'Liri', 'milieu_central', '2003-04-04'],
  ['Noah', 'Nabé', 'milieu_central', '2004-07-21'],
  ['Aimen', 'Laraba', 'milieu_offensif', '1997-10-13'],
  ["Jenny", "N'Kassa", 'ailier_droit', '2001-01-30'],
  ['Virgil', 'Gomis', 'attaquant', '1999-04-16'],
  ['Ibrahim', 'Et Touguani', 'attaquant', '1998-02-01'],
  ['Hugo', 'Guimard', 'attaquant', '2002-12-11'],
  ['Ethan', 'Lohezic', 'attaquant', '2007-10-31'],
  ['Rayan', 'Saïdi', 'attaquant', '2004-10-06'],
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
