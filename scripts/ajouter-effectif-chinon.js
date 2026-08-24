// Ajoute les joueurs manquants de l'effectif Avoine Olympique Chinon Cinais
// (National 2, saison 2026-2027) fourni par l'utilisateur (capture d'écran
// type transfermarkt). Reproduit le chemin "ajout manuel/scouté" de
// footlight-recherche.html (email synthétique @scoute.footlight.fr, profil
// non public, badge déclaratif) — pas de compte auth créé.
//
// club = "Avoine Olympique Chinon" (sans "Cinais") : calendrier_officiel
// utilise la forme abrégée "Avoine O. Chinon C. 1" (vérifié via
// diagnostic-club-chinon.js), qui se rapproche via clubWordsMatch
// (generer-calendriers-existants.js) sur les mots "avoine"/"chinon"
// seulement — "cinais" romprait le rapprochement (absent de la forme
// abrégée "C."), donc volontairement omis du nom de club, comme pour
// Cestas SAG / US Castanet.
//
// Postes génériques de la source ("Défense", "Milieu") mappés sur
// defenseur_central/milieu_central par défaut faute de précision.
// "Milieu gauche" (absent de l'enum poste de l'app) mappé sur
// ailier_gauche, comme pour Blagnac FC / FC Chamalières.
//
// Anti-doublon : ignore tout joueur dont le nom (accents/casse ignorés)
// existe déjà n'importe où en base, comme le fait le formulaire manuel.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const CLUB = 'Avoine Olympique Chinon';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF AVOINE OLYMPIQUE CHINON
// CINAIS", 26/27).
const EFFECTIF = [
  { prenom: 'Oupoh Maxime', nom: 'Nagoli', poste: 'gardien', naissance: '2000-12-20' },
  { prenom: 'Nathan', nom: 'Lorenzelli', poste: 'gardien', naissance: '2006-12-29' },
  { prenom: 'Maxime', nom: 'Borges', poste: 'defenseur_central', naissance: '1995-07-20' },
  { prenom: 'Vincent', nom: 'Louves', poste: 'defenseur_central', naissance: '1995-02-01' },
  { prenom: 'Adama', nom: 'Bamba', poste: 'lateral_gauche', naissance: '2005-12-01' },
  { prenom: 'Bambo', nom: 'Diaby', poste: 'lateral_gauche', naissance: '2004-07-07' },
  { prenom: 'Corentin', nom: 'Faussot', poste: 'milieu_defensif', naissance: '1998-01-04' },
  { prenom: 'Juvrel', nom: 'Loumingou', poste: 'milieu_defensif', naissance: '1995-02-11' },
  { prenom: 'Matthieu', nom: 'Corre', poste: 'milieu_central', naissance: '2002-08-16' },
  { prenom: 'Irshad', nom: 'Abdallah', poste: 'milieu_defensif', naissance: '2001-02-09' },
  { prenom: 'Sahlimina', nom: 'Diaby', poste: 'milieu_defensif', naissance: '2006-02-20' },
  { prenom: 'Randy', nom: 'Pouteau', poste: 'milieu_central', naissance: '2004-04-14' },
  { prenom: 'Brandon', nom: 'Dady', poste: 'milieu_central', naissance: '1994-02-25' },
  { prenom: 'Mehdi', nom: 'Elanbri', poste: 'ailier_gauche', naissance: '1999-01-03' },
  { prenom: 'Léo', nom: 'Bouton', poste: 'milieu_offensif', naissance: '2002-11-12' },
  { prenom: 'Loan', nom: 'Gervais', poste: 'milieu_offensif', naissance: '2007-04-15' },
  { prenom: 'Cheick', nom: 'Diakité', poste: 'ailier_gauche', naissance: '2004-01-15' },
  { prenom: 'Maxime', nom: 'Thonnel', poste: 'ailier_droit', naissance: '1991-02-23' },
  { prenom: 'Abiola', nom: 'Badirou', poste: 'attaquant', naissance: '1993-05-31' },
  { prenom: 'Johan', nom: 'Bertrand', poste: 'attaquant', naissance: '2002-10-05' },
  { prenom: 'Christopher', nom: 'Marmin', poste: 'attaquant', naissance: null },
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
  console.log(`${j.prenom} ${j.nom} : à créer (${j.poste}, ${CLUB}, né(e) ${j.naissance || 'inconnu'}).`);
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
