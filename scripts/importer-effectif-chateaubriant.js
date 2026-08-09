// Importe l'effectif Voltigeurs de Châteaubriant (saison 26/27, capture
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

const CLUB = 'Voltigeurs Chateaubriant';
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
  ['Balamine', 'Dramé', 'gardien', '1999-11-19'],
  ['Lassine', 'Soumaoro', 'defenseur_central', '2002-12-19'],
  ['Lemouya', 'Goudiaby', 'defenseur_central', '1997-01-09'],
  ['Cheick', 'Konaté', 'defenseur_central', '2007-08-12'],
  ['Ibrahima', 'Leye', 'defenseur_central', '2007-01-21'],
  ['Diabel', 'Ndiaye', 'defenseur_central', '2000-12-15'],
  ['Eoghan', 'Nolin', 'defenseur_central', '2003-03-13'],
  ['Yanis', 'Fofana', 'lateral_gauche', '2007-10-19'],
  ['Arnaud', 'Luzayadio', 'lateral_droit', '1999-07-19'],
  ['Randy', 'Mavinga', 'lateral_droit', '2000-05-01'],
  ['Bachir', 'Diop', 'milieu_defensif', '2002-08-21'],
  ['Léo', 'Tremblay', 'milieu_defensif', '2003-05-06'],
  ['Loris', 'Dupont', 'milieu_central', '2006-04-17'],
  ['Tiago', 'Duarte', 'milieu_central', '2006-06-18'],
  ['Assadillahi', 'Ahamada', 'milieu_offensif', '1999-09-12'],
  ['Akhibou', 'Ly', 'milieu_offensif', '1998-12-28'],
  ['Abdou Karim', 'Diallo', 'ailier_droit', '2003-05-15'],
  ['Hugo', 'Chambon', 'attaquant', '1996-08-10'],
  ['Godwin', 'Bentil', 'attaquant', '2001-01-30'],
  ['Clarence', 'Kegongo', 'attaquant', '2005-05-07'],
  ['Babacar', 'Gueye Sène', 'attaquant', '2000-07-28'],
];

// Magatte Ndiaye (déjà "Voltigeurs Chateaubriant") et Arnaud Guedj (déjà
// "Chateaubriant") sont déjà en base au même club, sous une variante de nom
// : correction du nom de club uniquement, poste déjà correct.
//
// Clément Milon (ex-US Saint-Malo) et N'Famara Diaby (ex-Les Herbiers VF)
// sont des transferts confirmés vers Voltigeurs Chateaubriant.
const TRANSFERTS = [
  { id: 'cf2ed3d2-78a5-484b-80f3-d55a8b94c0ac', prenom: 'Magatte', nom: 'Ndiaye', poste: 'gardien' },
  { id: '3b798b1e-4385-495e-82a0-bf4584436a79', prenom: 'Arnaud', nom: 'Guedj', poste: 'milieu_central' },
  { id: '6bd4caf8-70fe-4ed3-b517-641d517be330', prenom: 'Clément', nom: 'Milon', poste: 'gardien' },
  { id: '53d4372e-fc26-408c-8090-22bdddc1428c', prenom: "N'Famara", nom: 'Diaby', poste: 'ailier_gauche' },
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
