// Importe l'effectif US Avranches (saison 26/27, capture Transfermarkt)
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

const CLUB = 'US Avranches';
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
  ['Anthony', 'Beuve', 'gardien', '1988-06-24'],
  ['Hereba', 'Savane', 'defenseur_central', '2005-04-16'],
  ['Bryan', 'Nokoue', 'defenseur_central', '2002-05-23'],
  ['Baye Ablaye', 'Mbaye', 'defenseur_central', '2004-01-12'],
  ['Paul', 'Terrien', 'defenseur_central', '2002-01-17'],
  ['Zacharie', 'Iscaye', 'lateral_droit', '2000-10-02'],
  ['Ethan', 'Cloarec', 'lateral_droit', '2005-06-27'],
  ['Loïs', 'Martins', 'milieu_central', '2004-02-09'],
  ['Ibrahima', 'Doucouré', 'ailier_gauche', '2004-12-25'],
  ['Mehdi', 'Moujetzky', 'attaquant', '2003-11-25'],
];

// Sasha Delestre, Emeric Dudouit, Noah Françoise, Charles Boateng, Jessy Pi,
// Kenny Herbin et Ali Dicko existent déjà à US Avranches avec des données
// correctes : pas de doublon à insérer, pas d'action nécessaire.
//
// Transferts/corrections confirmés :
// - Killian Gesmier, Shahin Cissé, Anas Lamrabette sont déjà à US Avranches
//   mais leur poste est stocké dans un ancien format à corriger.
// - Aly-Enzo Hamon (ex-Angoulême Charente FC) et Noah Adekalom (ex-Les
//   Herbiers VF) rejoignent US Avranches.
const TRANSFERTS = [
  { id: '1665e104-1c22-47b9-8166-2af6032fb31c', prenom: 'Killian', nom: 'Gesmier', poste: 'milieu_central' },
  { id: '08e9b8db-d8d9-419a-9472-c9e810d68427', prenom: 'Shahin', nom: 'Cissé', poste: 'ailier_gauche' },
  { id: 'aefddf8f-457b-4f99-bfc3-7b32fa40e4e9', prenom: 'Anas', nom: 'Lamrabette', poste: 'ailier_droit' },
  { id: '54beee7a-a013-4a53-9986-cfa29e0034cc', prenom: 'Aly-Enzo', nom: 'Hamon', poste: 'lateral_gauche' },
  { id: '3a8cf382-e216-49d0-86d8-875adb70ae18', prenom: 'Noah', nom: 'Adekalom', poste: 'ailier_gauche' },
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
