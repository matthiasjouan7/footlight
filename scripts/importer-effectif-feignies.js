// Importe l'effectif Entente Feignies Aulnoye FC (saison 26/27, capture
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

const CLUB = 'Entente Feignies Aulnoye FC';
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
  ['Matthieu', 'Rongier', 'gardien', '2002-04-10'],
  ['Bryan', 'Bernard', 'gardien', '2000-05-05'],
  ['Baptiste', 'Rolland', 'defenseur_central', '2003-01-14'],
  ['Maxime', 'Wackers', 'defenseur_central', '1998-01-01'],
  ['Florent', 'Vasseur', 'defenseur_central', '2002-07-23'],
  ['Jiannin', 'Bérénice', 'lateral_gauche', '1998-11-30'],
  ['Paul', 'Mbelek', 'lateral_droit', '1999-07-22'],
  ['Pascal', 'Dufour', 'lateral_droit', '2001-02-08'],
  ['Randi', 'Goteni', 'milieu_defensif', '1995-07-05'],
  ['Giovanni', 'Hospital', 'milieu_defensif', '2000-01-14'],
  ['Baptiste', 'Thiefin', 'milieu_defensif', '2002-02-01'],
  ['Yassine', 'Chah', 'milieu_central', '1999-06-18'],
  ['Thomas', 'De Parmentier', 'ailier_droit', '1990-05-14'],
  ['Moustapha', 'Cissé', 'attaquant', '1993-08-09'],
  ['Yassine', 'Haouari', 'attaquant', '2003-02-13'],
  ['Christopher', 'Piedanna', 'attaquant', '2001-01-02'],
  ['Abdoulaye', 'Gory', 'attaquant', '2003-01-01'],
];

// Transfert confirmé : Steevy Mazikou (id connu, ex-US Avranches) rejoint
// Feignies. On met à jour son profil existant plutôt que d'en créer un doublon.
const TRANSFERTS = [
  { id: '89d83a44-63f6-454d-852f-e62d209493e1', prenom: 'Steevy', nom: 'Mazikou', poste: 'lateral_gauche' },
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
