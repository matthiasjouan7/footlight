// Importe l'effectif Vendée Poiré Football (saison 26/27, capture
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

const CLUB = 'Vendée Poiré Football';
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
  ['Roberto', 'Ahyi', 'gardien', '1996-07-29'],
  ['Ebenesere', 'Koudou', 'gardien', '2002-07-17'],
  ['Chris', 'Goteni', 'defenseur_central', '1998-09-10'],
  ['Melvin', 'Bachelet', 'defenseur_central', '2003-05-23'],
  ['Mathys', 'Lourdin', 'defenseur_central', '2000-05-13'],
  ['Maxence', 'Blé', 'defenseur_central', '2002-04-24'],
  ['Jason', 'Nginamau', 'defenseur_central', '1995-04-27'],
  ['Yoan', 'Pinson', 'lateral_gauche', '1999-01-13'],
  ['Léo', 'Berlin', 'lateral_droit', '1998-01-13'],
  ['Victor', 'Philibert', 'lateral_droit', '2004-07-01'],
  ['Bryan', 'Ngwabije', 'milieu_defensif', '1998-05-30'],
  ['Edouardo', 'Bathily', 'milieu_central', '1993-02-23'],
  ['Théo', 'Boucard', 'milieu_central', '2000-11-11'],
  ['Naël', 'Bensoula', 'milieu_offensif', '2003-09-12'],
  ['Thomas', 'Romero', 'milieu_offensif', '1998-08-29'],
  ['Lény', 'Vincent', 'milieu_offensif', '2007-08-08'],
  ['Emilien', 'Chauvet', 'ailier_gauche', '1999-07-12'],
  ['Léo', 'Botz', 'ailier_gauche', '2005-01-11'],
  ['Lilian', 'Bonnin', 'ailier_gauche', '2006-04-28'],
  ['Ahmat', 'Moussa Youssouf', 'ailier_gauche', '2003-09-18'],
  ['Mathias', 'Lopes', 'ailier_droit', '1998-07-04'],
  ['Bryan', 'Thorin', 'ailier_droit', '2002-12-12'],
  ['Davel', 'Mayela', 'attaquant', '1996-01-29'],
  ['Lenny', 'Leonil', 'attaquant', '1998-03-30'],
  ['Julien', 'Trichet', 'attaquant', '2007-01-04'],
];

// Brendan Lebas est déjà en base sous le nom de club raccourci "LE
// POIRE/VIE VF" (même club, sans poste renseigné) : correction du nom de
// club et ajout du poste. Sacha Lemarié (ex-US Granville) est un transfert
// confirmé vers Vendée Poiré Football.
const TRANSFERTS = [
  { id: 'e25d0193-73ac-4599-8aef-815d65767b37', prenom: 'Brendan', nom: 'Lebas', poste: 'milieu_central' },
  { id: '34ed34e2-2fa0-4b86-8d89-91da19de2a36', prenom: 'Sacha', nom: 'Lemarié', poste: 'lateral_droit' },
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

console.log(`\n${TRANSFERTS.length} transfert(s)/correction(s) à appliquer :`);
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
