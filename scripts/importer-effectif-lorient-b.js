// Importe l'effectif FC Lorient B (saison 26/27, capture Transfermarkt)
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

const CLUB = 'FC Lorient B';
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
  ['Ilan', 'Pain', 'gardien', '2007-01-03'],
  ['Lucas', 'Leaudais', 'defenseur_central', '2004-09-26'],
  ['Noam', 'Marchal', 'defenseur_central', '2006-03-20'],
  ['Matis', 'Brault', 'lateral_droit', '2003-12-30'],
  ['Jai', 'Semenyo', 'lateral_droit', '2003-07-13'],
  ['Samba', 'Diop', 'milieu_central', '2006-01-06'],
  ['Sohaib', 'Belarbi', 'milieu_central', '2005-06-15'],
  ['Martin', 'Bley', 'milieu_offensif', '2006-01-23'],
  ['Mohamed-Anouar', 'Hmamouch', 'milieu_offensif', '2006-07-08'],
  ['Samir', 'Haribou', 'attaquant', '2007-04-18'],
  ['Salah-Dine', 'El Mezouari', 'attaquant', '2004-06-26'],
  ['Mamadou', 'Koné', 'attaquant', '2006-11-20'],
];

// Bahliseny Fofana, Izak Akakpo, Stevan Siba, Cyril Borval, Noah Le Gal et
// Daniel Semedo sont déjà en base sous le nom de club raccourci "Lorient"
// (même club, poste déjà correct) : correction du nom de club uniquement.
// Antton Mouledous est aussi déjà à "Lorient" mais avec un poste dans un
// ancien format ("milieu_droit", hors enum) à corriger. Le Samba Diop déjà
// en base à "Chateaubriant" est un homonyme (personne différente) : le
// nouveau Samba Diop de FC Lorient B est donc inséré comme nouveau joueur.
const TRANSFERTS = [
  { id: '499b6542-41e6-4020-858b-e39d3cc1d09d', prenom: 'Bahliseny', nom: 'Fofana', poste: 'gardien' },
  { id: 'a1f42ba8-486a-4d7a-9b33-e68d08976cd1', prenom: 'Izak', nom: 'Akakpo', poste: 'defenseur_central' },
  { id: 'e52465fd-2342-4ff1-a358-432f72ee2fd0', prenom: 'Stevan', nom: 'Siba', poste: 'defenseur_central' },
  { id: '3b29d56d-4ce1-49b8-9392-d45aa393e860', prenom: 'Cyril', nom: 'Borval', poste: 'lateral_gauche' },
  { id: '07a04d32-4c6c-4d81-a157-1db12d6a8f9a', prenom: 'Noah', nom: 'Le Gal', poste: 'lateral_gauche' },
  { id: '0ea48421-b449-460b-b91e-69723da6347d', prenom: 'Daniel', nom: 'Semedo', poste: 'milieu_central' },
  { id: '752613e7-93a1-4553-9973-8bf2f476a779', prenom: 'Antton', nom: 'Mouledous', poste: 'ailier_droit' },
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
