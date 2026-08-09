// Importe l'effectif ESTAC Troyes B (saison 26/27, capture Transfermarkt)
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

const CLUB = 'ESTAC Troyes B';
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
  ['Nino', 'Cornuau', 'gardien', '2007-07-05'],
  ['Marc-Anthony', 'Nkoumouck', 'gardien', '2006-04-30'],
  ['Enzo', 'Kost', 'defenseur_central', '2006-06-24'],
  ['Preston', 'Zenga', 'defenseur_central', '2007-03-13'],
  ['Lassana', 'Simakha', 'defenseur_central', '2007-04-12'],
  ['Tom', 'Chupin', 'lateral_gauche', '2006-01-04'],
  ['Naël', 'Betka', 'lateral_gauche', '2007-10-23'],
  ['Noah', 'Donkor', 'lateral_droit', '2006-11-25'],
  ['Enisio', 'Carneiro', 'lateral_droit', '2007-07-17'],
  ['Karamady', 'Gassama', 'milieu_defensif', '2006-07-16'],
  ['Salimou', 'Diarra', 'milieu_defensif', '2007-01-09'],
  ['Aïssa', 'Azehaf', 'milieu_defensif', '2007-02-26'],
  ['Amadou', 'Diallo', 'milieu_central', '2006-02-26'],
  ['Soan', 'Ameline', 'milieu_central', '2008-05-29'],
  ['Mathys', 'Ouhab', 'milieu_offensif', '2007-02-16'],
  ['Wylan', 'Pierrilus', 'ailier_droit', '2006-01-01'],
  ['Preston', 'Nsifua Bazola', 'attaquant', '2006-09-04'],
  ['Arthylio', 'Nadé', 'attaquant', '2007-03-19'],
  ['Christ', 'Batola', 'attaquant', '2009-06-03'],
  ['Yacouba', 'Koné', 'attaquant', '2007-06-21'],
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
