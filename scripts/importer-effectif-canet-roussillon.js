// Importe l'effectif Canet Roussillon FC (saison 26/27, capture
// Transfermarkt) dans la table joueurs. Vérifie les doublons potentiels
// puis affiche un aperçu avant toute écriture.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);

const supabase = createClient(supabaseUrl, supabaseKey);

const CLUB = 'Canet Roussillon FC';
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
  ['Damien', 'Graves', 'gardien', '1994-05-04'],
  ['Benoît', 'Verrecken', 'gardien', '2004-06-23'],
  ['Aibou', 'Diamanka', 'gardien', '2003-02-07'],
  ['Mathéo', 'Torres', 'defenseur_central', '2006-02-10'],
  ['Vincent', 'Decker', 'defenseur_central', '1993-04-30'],
  ['Tony', 'Algrin', 'defenseur_central', '2002-02-09'],
  ['Alexandre', 'Charrat', 'defenseur_central', '2000-11-06'],
  ['Pablo', 'Bonneil', 'lateral_gauche', '2003-09-23'],
  ['Abdessalam', 'Zerkoune', 'lateral_droit', '1994-06-09'],
  ['Kévin', 'Malpon', 'milieu_defensif', '1996-03-01'],
  ['Anthony', 'Decherf', 'milieu_defensif', '1996-05-26'],
  ['Romain', 'Thomas', 'milieu_defensif', '1996-09-25'],
  ['Momar', 'Gadji', 'milieu_defensif', '1997-01-21'],
  ['Loan', 'Chaubet', 'milieu_central', '2005-02-25'],
  ['Julien', 'Pujos', 'milieu_defensif', '2007-09-14'],
  ['Luca', 'Pélissier', 'milieu_gauche', '2000-10-03'],
  ['Samy', 'El Khiar', 'milieu_offensif', '2001-02-21'],
  ['Iliès', 'Soudani', 'milieu_offensif', '2000-01-29'],
  ['Ibrahima', 'Mboup', 'ailier_droit', '1994-11-01'],
  ['Zanga', 'Koné', 'attaquant', '2004-11-12'],
  ['Brahim', 'Mahamat', 'attaquant', '1995-11-13'],
  ['Chris', 'Saint-Germain', 'attaquant', '2006-02-27'],
  ['Youssouf', 'Dembélé', 'attaquant', '1996-04-06'],
];

// Transferts/corrections confirmés : Quentin Hitte (ex-Aviron Bayonnais FC)
// rejoint Canet Roussillon FC ; Bilal Traoré est la même personne déjà en
// base sous le club raccourci "Canet" (nom de club et poste à corriger).
const TRANSFERTS = [
  { id: '2c5d86e1-eefe-4412-8d17-7eb59b75847b', prenom: 'Quentin', nom: 'Hitte', poste: 'lateral_droit' },
  { id: 'cfcd1a95-b24f-48b6-9f0c-7fed734c52ee', prenom: 'Bilal', nom: 'Traoré', poste: 'attaquant' },
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

console.log(`\n${TRANSFERTS.length} transfert(s) à appliquer :`);
for (const t of TRANSFERTS) console.log(`  ${t.prenom} ${t.nom} → club="${CLUB}", niveau="${NIVEAU}", poste="${t.poste}"`);

if (!dryRun) {
  const { error: insErr } = await supabase.from('joueurs').insert(lignes);
  if (insErr) { console.error('Erreur insertion :', insErr.message); process.exit(1); }
  for (const t of TRANSFERTS) {
    const { error: updErr } = await supabase.from('joueurs').update({ club: CLUB, niveau: NIVEAU, poste: t.poste }).eq('id', t.id);
    if (updErr) { console.error(`Erreur mise à jour transfert ${t.prenom} ${t.nom} :`, updErr.message); process.exit(1); }
  }
  console.log('\nTerminé.');
} else {
  console.log('\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour appliquer réellement.');
}
