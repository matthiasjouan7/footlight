// Importe l'effectif FC Bourgoin-Jallieu (saison 26/27, capture
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

const CLUB = 'FC Bourgoin-Jallieu';
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
  ['Ronan', 'Jay', 'gardien', '2001-04-25'],
  ['Florian', 'Allapo', 'gardien', '1997-01-24'],
  ['Félix', 'Nzouango', 'defenseur_central', '2003-01-07'],
  ['Hichem', 'Khoutri', 'defenseur_central', '2002-05-16'],
  ['Sambou', 'Sarr', 'defenseur_central', '2000-11-11'],
  ['Mamadou', 'Ndiaye', 'lateral_gauche', '1995-05-28'],
  ['Erwan', 'Nordé', 'lateral_droit', '2003-06-11'],
  ['Houssame', 'Boinali', 'lateral_droit', '1996-07-16'],
  ['Jimmy', 'Nirlo', 'milieu_defensif', '1988-08-23'],
  ['Marley', 'Felix', 'milieu_defensif', '2003-01-02'],
  ['Matthieu', 'Mainge', 'milieu_defensif', '2001-08-02'],
  ['Yanis', 'Mecheri', 'milieu_defensif', '1993-01-14'],
  ['Dorian', 'Samba', 'milieu_defensif', '1999-03-15'],
  ['Ilan', 'Carrafa', 'milieu_central', '2006-08-19'],
  ['Engeda', 'Romeyer', 'milieu_central', '2007-07-13'],
  ['Kelian', 'Mersel', 'milieu_offensif', '2000-07-19'],
  ['Noah', 'Granjon', 'milieu_offensif', '2007-03-25'],
  ['Ylan', 'Étienne', 'ailier_gauche', '2006-03-08'],
  ['Adil', 'Hitouss', 'ailier_droit', '1998-12-31'],
  ['Livty', 'Kpolo', 'attaquant', '2002-05-17'],
  ['Idrissa', 'Ba', 'attaquant', '1990-11-11'],
];

const CORRECTIONS = [];

// Supabase plafonne chaque requête à 1000 lignes (db-max-rows) : au-delà, il
// faut paginer avec .range() sous peine de manquer des doublons situés après
// la 1000e ligne.
let joueurs = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase.from('joueurs').select('id, prenom, nom, club, niveau, poste').range(from, from + 999);
  if (error) { console.error('Erreur lecture joueurs :', error.message); process.exit(1); }
  if (!data || !data.length) break;
  joueurs = joueurs.concat(data);
  if (data.length < 1000) break;
}

let doublons = 0;
for (const [prenom, nom] of NOUVEAUX) {
  const np = normalizeName(prenom), nn = normalizeName(nom);
  const matches = (joueurs || []).filter((j) => normalizeName(j.prenom) === np && normalizeName(j.nom) === nn);
  for (const match of matches) {
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

console.log(`\n${CORRECTIONS.length} correction(s)/transfert(s) à appliquer :`);
for (const c of CORRECTIONS) console.log(`  ${c.prenom} ${c.nom} → club="${CLUB}", niveau="${NIVEAU}", poste="${c.poste}"`);

if (!dryRun) {
  const { error: insErr } = await supabase.from('joueurs').insert(lignes);
  if (insErr) { console.error('Erreur insertion :', insErr.message); process.exit(1); }
  for (const c of CORRECTIONS) {
    const { error: updErr } = await supabase.from('joueurs').update({ club: CLUB, niveau: NIVEAU, poste: c.poste }).eq('id', c.id);
    if (updErr) { console.error(`Erreur mise à jour correction ${c.prenom} ${c.nom} :`, updErr.message); process.exit(1); }
  }
  console.log('\nTerminé.');
} else {
  console.log('\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour appliquer réellement.');
}
