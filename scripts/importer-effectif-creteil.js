// Importe l'effectif US Créteil Football (saison 26/27, capture Transfermarkt)
// dans la table joueurs. Nathanaël Bai existe déjà (transfert depuis US
// Saint-Malo) : son profil existant est mis à jour plutôt que dupliqué,
// tous les autres sont de nouveaux joueurs.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);

const supabase = createClient(supabaseUrl, supabaseKey);

const CLUB = 'US Créteil Football';
const NIVEAU = 'N1';
const SAISON = '2026-2027';
const BAI_ID_EXISTANT = 'e01618da-5247-4db8-b13a-89fae5f17ca6';

function normalizeName(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}
function slugifyName(s) {
  return normalizeName(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x';
}

// [prenom, nom, poste, date_naissance ISO]
const NOUVEAUX = [
  ['Hugo', 'Cointard', 'gardien', '1995-09-18'],
  ['Stanley', 'Kouamé', 'gardien', '2001-08-02'],
  ['Lucas', 'Camelot', 'defenseur_central', '1999-02-07'],
  ['Zakaria', 'Belkouche', 'defenseur_central', '1992-07-08'],
  ['Aboubacar', 'Magnora', 'defenseur_central', '1996-05-12'],
  ['Axel', 'Rouquette', 'lateral_gauche', '2003-01-01'],
  ['Stephen', 'Quemper', 'lateral_gauche', '1993-05-12'],
  ['Ladji', 'Traoré', 'lateral_gauche', '2001-10-30'],
  ['Ahmad', 'Ngouyamsa', 'lateral_droit', '2000-12-21'],
  ['Sidy', 'Diagne', 'lateral_droit', '2002-01-11'],
  ['Nama', 'Fofana', 'lateral_droit', '1990-07-12'],
  ['Adama', 'Niaka', 'milieu_defensif', '2000-12-15'],
  ['Adrien', 'Louveau', 'milieu_defensif', '2000-02-01'],
  ['Guillaume', 'Taty', 'milieu_defensif', '1997-01-15'],
  ['Ryan', 'Ferhaoui', 'milieu_central', '1997-05-31'],
  ['Liamine', 'Mokdad', 'milieu_central', '2000-05-21'],
  ['Tommy', 'Iva', 'ailier_droit', '2000-06-02'],
  ['Jason', 'Mbock', 'milieu_gauche', '1999-11-01'],
  ['Yanick', 'Aguemon', 'milieu_gauche', '1992-02-11'],
  ['Abdeldjalil', 'Hachem', 'milieu_offensif', '2001-06-22'],
  ['Ylan', 'Gomes', 'ailier_gauche', '2002-07-22'],
  ['Arsène', 'Elogo', 'ailier_gauche', '1995-04-22'],
  ['Yann', 'Diebold', 'ailier_droit', '2000-04-01'],
  ['Nouha', 'Dicko', 'attaquant', '1992-05-14'],
  ['Léo', 'Bouchet', 'attaquant', '2001-06-06'],
  ['Romain', 'Montiel', 'attaquant', '1995-04-22'],
  ['Mohamed', 'Ben Fredj', 'attaquant', '2000-05-09'],
  ['Ibtoihi', 'Hadari', 'attaquant', '2003-10-03'],
  ['Youssef', 'Boujenfa', 'attaquant', '2005-06-12'],
];

console.log(`Transfert : Nathanaël Bai (id=${BAI_ID_EXISTANT}) -> club="${CLUB}"`);
if (!dryRun) {
  const { error: baiErr } = await supabase.from('joueurs').update({ club: CLUB }).eq('id', BAI_ID_EXISTANT);
  if (baiErr) { console.error('Erreur transfert Bai :', baiErr.message); process.exit(1); }
}

const lignes = NOUVEAUX.map(([prenom, nom, poste, date_naissance]) => ({
  prenom, nom, poste, club: CLUB, niveau: NIVEAU, saison: SAISON, date_naissance,
  email: `${slugifyName(prenom)}.${slugifyName(nom)}.manuel@scoute.footlight.fr`,
  matchs_joues: 0, buts: 0, badge: 'declaratif', profil_public: false,
}));

console.log(`\n${lignes.length} nouveau(x) joueur(s) à insérer :`);
for (const l of lignes) console.log(`  ${l.prenom} ${l.nom} | poste=${l.poste} | né(e) le ${l.date_naissance}`);

if (!dryRun) {
  const { error: insErr } = await supabase.from('joueurs').insert(lignes);
  if (insErr) { console.error('Erreur insertion :', insErr.message); process.exit(1); }
  console.log('\nTerminé.');
} else {
  console.log('\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour appliquer réellement.');
}
