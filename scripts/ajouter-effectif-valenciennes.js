// Ajoute les joueurs manquants de l'effectif Valenciennes FC (Ligue 3,
// saison 2026-2027) fourni par l'utilisateur (capture d'écran type
// transfermarkt). Même chemin que ajouter-effectif-bastia.js /
// ajouter-effectif-versailles.js / ajouter-effectif-caen.js /
// ajouter-effectif-amiens.js.
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

const CLUB = 'Valenciennes FC';
const NIVEAU = 'Ligue 3';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF VALENCIENNES FC", 26/27).
const EFFECTIF = [
  { prenom: 'Jean', nom: 'Louchet', poste: 'gardien', naissance: '1996-12-03' },
  { prenom: 'Justin', nom: 'Lacombe', poste: 'gardien', naissance: '2003-04-09' },
  { prenom: 'Dany', nom: 'Goprou', poste: 'defenseur_central', naissance: '1998-10-03' },
  { prenom: 'Maël', nom: 'Zogba', poste: 'defenseur_central', naissance: '2000-01-19' },
  { prenom: 'Bryan', nom: 'Passi', poste: 'defenseur_central', naissance: '1997-08-05' },
  { prenom: 'Nolann', nom: 'Bourichon', poste: 'defenseur_central', naissance: '2008-01-31' },
  { prenom: 'Abou', nom: 'Meïté', poste: 'defenseur_central', naissance: '2004-03-05' },
  { prenom: 'Christopher', nom: 'Rocchia', poste: 'lateral_gauche', naissance: '1998-02-01' },
  { prenom: 'Abdelwahed', nom: 'Wahib', poste: 'lateral_gauche', naissance: '2000-01-27' },
  { prenom: 'Noam', nom: 'Blé', poste: 'lateral_gauche', naissance: '2003-03-17' },
  { prenom: 'Salif', nom: 'Lebouath', poste: 'lateral_droit', naissance: '2001-11-14' },
  { prenom: 'Derrick', nom: 'Abu', poste: 'lateral_droit', naissance: '2003-12-18' },
  { prenom: 'Mabrouk', nom: 'Rouaï', poste: 'milieu_central', naissance: '2000-11-01' },
  { prenom: 'Thibault', nom: 'Maréchal', poste: 'milieu_central', naissance: '2002-02-28' },
  { prenom: 'Samir', nom: 'Belloumou', poste: 'milieu_central', naissance: '1994-05-02' },
  { prenom: 'Vincent', nom: 'Marcel', poste: 'milieu_offensif', naissance: '1997-04-09' },
  { prenom: 'Luka', nom: 'Boiteau', poste: 'milieu_offensif', naissance: '2006-01-02' },
  { prenom: 'Zaïd', nom: 'Amir', poste: 'ailier_gauche', naissance: '2002-05-11' },
  { prenom: 'Rayane', nom: 'Ekra', poste: 'ailier_gauche', naissance: '2003-11-18' },
  { prenom: 'Daou', nom: 'Diomandé', poste: 'ailier_droit', naissance: '2003-08-05' },
  { prenom: 'Kylian', nom: 'Kouakou', poste: 'ailier_droit', naissance: '2007-01-05' },
  { prenom: 'Charles', nom: 'Abi', poste: 'attaquant', naissance: '2000-04-12' },
  { prenom: 'Gaëtan', nom: 'Courtet', poste: 'attaquant', naissance: '1989-02-22' },
  { prenom: 'Célestin', nom: 'Nyemb', poste: 'attaquant', naissance: '2006-01-04' },
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
