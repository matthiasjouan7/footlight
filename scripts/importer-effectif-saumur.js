// Importe l'effectif Olympique Saumur (saison 26/27, capture Transfermarkt)
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

const CLUB = 'Olympique Saumur';
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
  ['Quentin', 'Galvez-Diarra', 'gardien', '2001-09-08'],
  ['Aubrel', 'Koutsimouka', 'defenseur_central', '2001-08-30'],
  ['Killian', 'Le Ber', 'defenseur_central', '2000-05-24'],
  ['Jean-Paul', 'Montalbetti', 'defenseur_central', '2000-05-17'],
  ['Benjamin', 'Pillier', 'defenseur_central', '1997-06-04'],
  ['Mathis', 'Bochereau', 'defenseur_central', '2006-06-08'],
  ['Bovid', 'Itoua Ngoua', 'defenseur_central', '1988-02-17'],
  ['Maël', 'Landelle', 'lateral_gauche', '2003-04-10'],
  ['Bradley', 'Mbuta', 'lateral_gauche', '2000-07-24'],
  ['Mattéo', 'Pezard', 'lateral_gauche', '2003-09-24'],
  ['Kryss', 'Chapelle', 'lateral_droit', '2000-03-28'],
  ['Nathan', 'Benmoussa', 'lateral_droit', '2000-02-09'],
  ['Artur', 'Viaud', 'milieu_defensif', '1999-07-21'],
  ['Martin', 'Vidgrin', 'milieu_defensif', '2002-01-05'],
  ['Walim', 'Lgharbi', 'milieu_central', '2003-01-25'],
  ['Quentin', 'Biettmann', 'milieu_central', '1998-03-09'],
  ['Yannis', 'Matingou', 'milieu_central', '1999-11-22'],
  ['Emmanuel', 'Bourgaud', 'ailier_droit', '1987-10-25'],
  ['Mathias', 'Blanchard', 'ailier_droit', '1999-10-13'],
  ['Plamedi', 'Buni Jorge', 'milieu_offensif', '2000-09-07'],
  ['Leny', 'Payraudeau', 'ailier_gauche', '2003-02-24'],
  ['Namory', 'Keita', 'ailier_droit', '2002-08-14'],
  ['Bridge', 'Ndilu', 'attaquant', '2000-07-21'],
  ['Junior', 'Abdourahamani', 'attaquant', '2003-06-24'],
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
