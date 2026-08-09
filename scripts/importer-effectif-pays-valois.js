// Importe l'effectif US Le Pays du Valois (saison 26/27, capture
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

const CLUB = 'US Le Pays du Valois';
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
  ['Hortalin', 'Zadi', 'gardien', '1989-11-07'],
  ['El Nasry', 'Mistoihi', 'gardien', '2005-03-27'],
  ['Allan', 'Nengoue', 'defenseur_central', '2002-09-26'],
  ['Denys', 'Bain', 'defenseur_central', '1993-07-02'],
  ['Lassana', 'Sylla', 'defenseur_central', '2002-07-02'],
  ['Darnel', 'Koré', 'defenseur_central', '2004-01-04'],
  ['Isaac', 'Luneko', 'defenseur_central', '2004-02-03'],
  ['Yacouba', 'Coulibaly', 'lateral_gauche', '1994-10-02'],
  ['Jessy', 'Rotsen', 'lateral_droit', '1999-05-20'],
  ['Omaré', 'Gassama', 'milieu_defensif', '1995-09-01'],
  ['Baissama', 'Sankoh', 'milieu_defensif', '1992-03-20'],
  ['Kévin Junior', 'Nguechoung', 'milieu_defensif', '2000-08-13'],
  ['Dalvin', 'Fellice', 'milieu_defensif', '1998-11-16'],
  ['Denis', 'Amedovski', 'milieu_central', '2004-07-08'],
  ['Kévin', 'Colin', 'milieu_gauche', '1992-11-15'],
  ['Azzeddine', 'Toufiqui', 'milieu_offensif', '1999-04-25'],
  ['Riyan', 'Majdi', 'milieu_offensif', '2004-02-07'],
  ['Houdayfa', 'Camara', 'milieu_offensif', '2006-05-15'],
  ['Marwane', 'Rokami', 'milieu_offensif', '2006-03-13'],
  ['Ryan', 'Laplace', 'ailier_droit', '1998-07-25'],
  ['Brice', 'Seymour', 'ailier_droit', '2004-10-16'],
  ['Lyes', 'Aka', 'ailier_droit', '2003-01-28'],
  ['Metehan', 'Güclü', 'attaquant', '1999-04-02'],
  ['Sponky', 'Mbiagnin', 'attaquant', '2002-10-02'],
  ['Alassane', 'Dosso', 'attaquant', '1991-09-21'],
];

// Transferts confirmés : Gwilhem Tayot (ex-Vendée Les Herbiers) et Makan
// Sidibé (ex-US Granville) rejoignent US Le Pays du Valois. On met à jour
// leur profil existant plutôt que d'en créer un doublon.
const TRANSFERTS = [
  { id: '204afdff-46d5-4356-bbd5-0bf74c0bac85', prenom: 'Gwilhem', nom: 'Tayot', poste: 'lateral_gauche' },
  { id: '391a1f56-48d7-475c-aa1d-89a356985f19', prenom: 'Makan', nom: 'Sidibé', poste: 'milieu_gauche' },
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
