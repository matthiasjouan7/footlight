// Importe l'effectif Olympique Saumur (saison 26/27, capture Transfermarkt)
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

const CLUB = 'Olympique Saumur';
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
  ['Killian', 'Le Ber', 'defenseur_central', '2000-05-24'],
  ['Jean-Paul', 'Montalbetti', 'defenseur_central', '2000-05-17'],
  ['Namory', 'Keita', 'ailier_droit', '2002-08-14'],
  ['Bridge', 'Ndilu', 'attaquant', '2000-07-21'],
  ['Junior', 'Abdourahamani', 'attaquant', '2003-06-24'],
];

// Kryss Chapelle est déjà en base sous le nom de club raccourci "Saumur"
// (même club, poste déjà correct) : correction du nom de club uniquement.
// Walim Lgharbi et Emmanuel Bourgaud sont déjà à Olympique Saumur mais sans
// poste renseigné : ajout du poste. Quentin Biettmann et Yannis Matingou ont
// un poste en base à l'ancien format ("milieu central") : correction de
// format. Mathias Blanchard a un poste différent de la capture (confirmé).
// Leny Payraudeau est un transfert confirmé depuis Les Herbiers VF.
const TRANSFERTS = [
  { id: '9d7adef3-916b-48e3-8a02-34d846b40e65', prenom: 'Kryss', nom: 'Chapelle', poste: 'lateral_droit' },
  { id: 'ae138f6b-d633-4c55-a447-45cd720f8869', prenom: 'Walim', nom: 'Lgharbi', poste: 'milieu_central' },
  { id: 'ce75be67-d66f-4575-b9eb-bac7672a17b6', prenom: 'Quentin', nom: 'Biettmann', poste: 'milieu_central' },
  { id: '0c87f813-8849-4ac1-a9e0-b03521326757', prenom: 'Yannis', nom: 'Matingou', poste: 'milieu_central' },
  { id: '15f90d5b-8527-4221-b85e-1355a1341829', prenom: 'Emmanuel', nom: 'Bourgaud', poste: 'ailier_droit' },
  { id: '567c1735-f125-46c0-a4e8-5462432bcc88', prenom: 'Mathias', nom: 'Blanchard', poste: 'ailier_droit' },
  { id: '2288b800-fbee-484e-9cba-98dcc613917d', prenom: 'Leny', nom: 'Payraudeau', poste: 'ailier_gauche' },
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
