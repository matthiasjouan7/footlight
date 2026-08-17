// Ajoute les joueurs manquants de l'effectif SM Caen (Ligue 3, saison
// 2026-2027) fourni par l'utilisateur (capture d'écran type transfermarkt).
// Même chemin que ajouter-effectif-bastia.js / ajouter-effectif-versailles.js.
//
// Anti-doublon : ignore tout joueur dont le nom (accents/casse ignorés)
// existe déjà n'importe où en base.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const CLUB = 'SM Caen';
const NIVEAU = 'Ligue 3';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF SM CAEN", 26/27).
const EFFECTIF = [
  { prenom: 'Anthony', nom: 'Mandréa', poste: 'gardien', naissance: '1996-12-25' },
  { prenom: 'Yannis', nom: 'Clémentia', poste: 'gardien', naissance: '1997-07-05' },
  { prenom: 'Parfait', nom: 'Mandanda', poste: 'gardien', naissance: '1989-11-10' },
  { prenom: 'Ryan', nom: 'Tutu', poste: 'gardien', naissance: '2005-04-01' },
  { prenom: 'Sacha', nom: "M'Baka", poste: 'defenseur_central', naissance: '2004-06-04' },
  { prenom: 'Diabé', nom: 'Bolumbu', poste: 'lateral_gauche', naissance: '2004-07-12' },
  { prenom: 'Lionel', nom: 'Carole', poste: 'lateral_gauche', naissance: '1991-04-12' },
  { prenom: 'Maxime', nom: 'Etuin', poste: 'lateral_gauche', naissance: '1995-08-15' },
  { prenom: 'Dennis', nom: 'Appiah', poste: 'lateral_droit', naissance: '1992-06-09' },
  { prenom: 'Nassim', nom: 'Titebah', poste: 'lateral_droit', naissance: '1998-01-13' },
  { prenom: 'Nazim', nom: 'Babaï', poste: 'lateral_droit', naissance: '2003-01-14' },
  { prenom: 'Hugo', nom: 'Lamouliatte', poste: 'lateral_droit', naissance: '2006-07-14' },
  { prenom: 'Josué', nom: 'Kimboma', poste: 'milieu_defensif', naissance: '2006-04-24' },
  { prenom: 'Freddy', nom: 'Bomo', poste: 'milieu_defensif', naissance: '2005-10-02' },
  { prenom: 'Gabin', nom: 'Tomé', poste: 'milieu_defensif', naissance: '2004-01-26' },
  { prenom: 'Zoumana', nom: 'Bagbema', poste: 'milieu_central', naissance: '2004-01-13' },
  { prenom: 'Mohamed-Amine', nom: 'El Idrissi', poste: 'milieu_central', naissance: '2005-04-20' },
  { prenom: 'Léo', nom: 'Milliner', poste: 'milieu_offensif', naissance: '2006-02-24' },
  { prenom: 'Ivann', nom: 'Botella', poste: 'ailier_gauche', naissance: '1999-06-28' },
  { prenom: 'Salim', nom: 'Diakité', poste: 'ailier_gauche', naissance: '2005-02-22' },
  { prenom: 'Mohamed', nom: 'Hafid', poste: 'ailier_droit', naissance: '2004-12-01' },
  { prenom: 'Keelyan', nom: 'Portut', poste: 'ailier_droit', naissance: '2006-11-21' },
  { prenom: 'Fahd', nom: 'El Khoumisi', poste: 'attaquant', naissance: '1993-06-01' },
  { prenom: 'Armand', nom: 'Gnanduillet', poste: 'attaquant', naissance: '1992-02-13' },
  { prenom: 'Samuel', nom: 'Noireau-Dauriat', poste: 'attaquant', naissance: '2003-01-01' },
];

function normaliser(str) {
  return (str || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
function slugifier(str) {
  return normaliser(str).replace(/[^a-z0-9]+/g, '');
}

const { data: joueurs, error } = await supabase.from('joueurs').select('id, prenom, nom, club');
if (error) { console.error('Erreur lecture joueurs :', error.message); process.exit(1); }
console.log(`${joueurs?.length || 0} joueur(s) en base.\n`);

let aInserer = 0, ignores = 0;
for (const j of EFFECTIF) {
  const existant = (joueurs || []).find(
    (x) => normaliser(x.prenom) === normaliser(j.prenom) && normaliser(x.nom) === normaliser(j.nom)
  );
  if (existant) {
    console.log(`${j.prenom} ${j.nom} : déjà en base (id=${existant.id}, club="${existant.club || '—'}"), ignoré.`);
    ignores++;
    continue;
  }
  const email = `${slugifier(j.prenom)}.${slugifier(j.nom)}.manuel@scoute.footlight.fr`;
  console.log(`${j.prenom} ${j.nom} : à créer (${j.poste}, ${CLUB}, né(e) ${j.naissance}).`);
  aInserer++;
  if (!dryRun) {
    const { error: insErr } = await supabase.from('joueurs').insert([{
      prenom: j.prenom, nom: j.nom, email,
      poste: j.poste,
      niveau: NIVEAU, club: CLUB, saison: SAISON,
      date_naissance: j.naissance,
      matchs_joues: 0,
      buts: 0,
      badge: 'declaratif',
      profil_public: false,
    }]);
    if (insErr) console.log(`  Erreur écriture : ${insErr.message}`);
  }
}
console.log(`\nRésumé : ${aInserer} joueur(s) à créer, ${ignores} déjà en base (ignoré(s)).`);
if (dryRun) console.log('DRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
