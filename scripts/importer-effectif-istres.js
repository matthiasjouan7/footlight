// Importe l'effectif Istres Football Club (saison 26/27, capture
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

const CLUB = 'Istres Football Club';
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
  ['Salim', 'Ben Boina', 'gardien', '1991-07-19'],
  ['Will-Césaire', 'Matimbou', 'gardien', '2000-02-11'],
  ['Ahmed', 'Soilihi', 'defenseur_central', '1996-07-01'],
  ['Brayan', 'Djadja', 'defenseur_central', '2007-04-21'],
  ['Nolann', 'Quémard', 'defenseur_central', '2003-08-14'],
  ['Abdelkrim', 'Khechmar', 'lateral_gauche', '1999-03-17'],
  ['Maxime', 'Renoir', 'lateral_gauche', '2005-12-24'],
  ['Thibault', 'Relange', 'lateral_gauche', '2001-09-21'],
  ['Dine Nasuir', 'Hamidou Ali', 'lateral_droit', '2000-07-21'],
  ['Salomon', 'Abergel', 'lateral_droit', '2004-07-04'],
  ['Landry', 'Nkulu', 'milieu_defensif', '1997-07-07'],
  ['Matéo', 'Loubatières', 'milieu_central', '2003-09-15'],
  ['William', 'Baku', 'milieu_central', '1999-01-11'],
  ['Amine', 'Mokhtari', 'ailier_droit', '2004-01-12'],
  ['Tomili', 'Moirabou', 'ailier_droit', '2004-04-08'],
  ['Jorès', 'Rahou', 'milieu_offensif', '2003-02-02'],
  ['Franck', 'Ondoa Edima', 'milieu_offensif', '2004-11-03'],
  ['Samir', 'Yara', 'milieu_offensif', '1999-03-17'],
  ['Ilian', 'Boudache', 'ailier_droit', '2002-12-14'],
  ['Bastian', 'Badu', 'attaquant', '2000-02-02'],
  ['Ibrahim', 'Madi', 'attaquant', '1998-05-19'],
];

// Transfert confirmé : Alexis Ebrard (ex-US Saint-Malo) rejoint Istres
// Football Club. On met à jour son profil existant plutôt que d'en créer un
// doublon.
const TRANSFERTS = [
  { id: 'ac4a70e9-6c18-4d25-8f6c-452e60302360', prenom: 'Alexis', nom: 'Ebrard', poste: 'attaquant' },
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
