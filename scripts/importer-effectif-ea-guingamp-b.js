// Importe l'effectif EA Guingamp B (saison 26/27, capture Transfermarkt)
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

const CLUB = 'EA Guingamp B';
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
  ['Noah', 'Marec', 'gardien', '2004-08-25'],
  ['Albert', 'Masson', 'gardien', '2007-01-13'],
  ['Gaspard', 'Franck Ambassa', 'gardien', '2006-01-05'],
  ['Nathan', 'Fondja', 'defenseur_central', '2005-10-30'],
  ['Idriss', 'Planeix', 'defenseur_central', '2007-01-15'],
  ['Nathan', 'Le Goff', 'defenseur_central', '2006-02-26'],
  ['Ibrahim', 'Fomba', 'defenseur_central', '2006-02-28'],
  ['Imdad', 'Charifou', 'defenseur_central', '2006-08-09'],
  ['Philippe', 'Nkouka', 'defenseur_central', '2005-02-13'],
  ['Noa', 'Ebane Caro', 'lateral_gauche', '2006-04-15'],
  ['Ibrahima', 'Diakité', 'milieu_defensif', '2007-06-03'],
  ['Mattéo', 'Bebey Sake', 'milieu_defensif', '2005-04-03'],
  ['Ben Ibrahim', 'Siby', 'milieu_defensif', '2005-08-03'],
  ['Trésor', 'Matondo', 'milieu_central', '2003-07-24'],
  ['Adel', 'Sebihi', 'milieu_offensif', '2007-06-08'],
  ['Salatiel', 'Decarpentrie', 'ailier_gauche', '2002-01-06'],
  ['Breyton', 'Fougeu', 'ailier_gauche', '2004-01-06'],
  ['Abdoulaye', 'Niakaté', 'ailier_gauche', '2004-10-01'],
  ['Landry', 'Kitenge', 'ailier_gauche', '2006-06-28'],
  ['Ewan', 'Aucan', 'ailier_droit', '2007-05-12'],
  ['Ilias', 'Miraoui', 'attaquant', '2005-03-31'],
  ['Nicolas', 'Florival', 'attaquant', '2006-11-10'],
  ['Jordi', 'Kuange Makala', 'attaquant', '2005-09-09'],
  ['Jean-Yves', 'Djegou', 'attaquant', '2007-07-07'],
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
