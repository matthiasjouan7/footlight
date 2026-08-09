// Importe l'effectif Aviron Bayonnais (saison 26/27, capture Transfermarkt)
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

const CLUB = 'Aviron Bayonnais FC';
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
  ['Charly', 'Jan', 'gardien', '1999-05-27'],
  ['Maxime', 'Debove', 'gardien', '2005-09-09'],
  ['Robin', 'Verhaeghe', 'defenseur_central', '2004-02-02'],
  ['Mathias', 'Lavenette', 'defenseur_central', '2006-04-29'],
  ['Youssouf', 'Koné', 'lateral_gauche', '1995-07-05'],
  ['Glenn', 'Younousse', 'lateral_droit', '2004-07-17'],
  ['Beimarse', 'Tankiev', 'milieu_defensif', '2002-02-20'],
  ['Pierre', 'Jouan', 'milieu_central', '2002-04-02'],
  ['Noah', 'Lahmadi', 'milieu_central', '2005-01-05'],
  ['Tim', 'Rey', 'milieu_offensif', '2003-02-11'],
  ['Nail', 'Kheroua', 'milieu_offensif', '2006-05-27'],
  ['Nohan', 'Traoré', 'ailier_gauche', '2003-06-26'],
  ['Jibril', 'Othman', 'attaquant', '2004-04-26'],
];

// Byani Mpata Lama, Charles-Élie Laprevotte et Djibrill Hattab sont déjà en
// base à Aviron Bayonnais FC avec des données correctes : pas de doublon à
// insérer, pas d'action nécessaire.
//
// Corrections confirmées :
// - Jonathan Abonckelet est déjà en base sous le nom de club raccourci
//   "Aviron Bayonnais" (même club, poste déjà correct) : correction du nom
//   de club uniquement.
// - Manech Billy est aussi déjà à "Aviron Bayonnais" avec un poste dans un
//   ancien format ("piston_droit") : correction du nom de club et du poste.
// - Mario Fortunato et Mehdi Nfati sont déjà à Aviron Bayonnais FC avec un
//   poste dans un ancien format ("milieu central", avec espace) : correction
//   du poste uniquement.
// - Noa Savignac est déjà à Aviron Bayonnais FC avec un poste dans un ancien
//   format ("milieu droit") : correction du poste uniquement.
const TRANSFERTS = [
  { id: '4d696b95-bc9b-41b5-beeb-3e6bf78193ba', prenom: 'Jonathan', nom: 'Abonckelet', poste: 'defenseur_central' },
  { id: '7f861e15-711c-4fb3-aded-46b3db07a6a0', prenom: 'Manech', nom: 'Billy', poste: 'lateral_droit' },
  { id: 'a1873188-7f21-45ad-90a7-e89aa8775452', prenom: 'Mario', nom: 'Fortunato', poste: 'milieu_central' },
  { id: 'b67ee473-d3b1-4bd2-9611-1417789f7457', prenom: 'Mehdi', nom: 'Nfati', poste: 'milieu_central' },
  { id: '9317dd4a-a24b-4027-9b28-663d01f68e2b', prenom: 'Noa', nom: 'Savignac', poste: 'ailier_droit' },
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
