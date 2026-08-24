// Ajoute les joueurs manquants de l'effectif SA Gazinet Cestas (National 2
// groupe A, saison 2026-2027) fourni par l'utilisateur (capture d'écran
// type transfermarkt). Reproduit le chemin "ajout manuel/scouté" de
// footlight-recherche.html (email synthétique @scoute.footlight.fr, profil
// non public, badge déclaratif) — pas de compte auth créé.
//
// club = "Cestas SAG" plutôt que "SA Gazinet Cestas" (titre de la capture) :
// calendrier_officiel utilise "Cestas Sag 1" (vérifié via
// diagnostic-club-cestas.js), et les mots "sa"/"gazinet" ne rapprochent pas
// du mot "sag" via clubWordsMatch (generer-calendriers-existants.js) —
// même précaution que pour Rodez AF 2/Pau FC 2/Anglet Genêts Foot.
//
// "Défense" (sans précision) mappé sur defenseur_central, "Arrière gauche"
// sur lateral_gauche, "Arrière droit" sur lateral_droit, "Milieu" (sans
// précision) sur milieu_central, "Avant-centre" sur attaquant, comme pour
// les effectifs précédents.
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

const CLUB = 'Cestas SAG';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF SA GAZINET CESTAS", 26/27).
const EFFECTIF = [
  { prenom: 'Ismaël', nom: 'Qrimeche', poste: 'gardien', naissance: '2007-03-13' },
  { prenom: 'Valentin', nom: 'Churlaud', poste: 'gardien', naissance: '2001-11-17' },
  { prenom: 'Anthony', nom: 'Gautier', poste: 'defenseur_central', naissance: '1996-12-04' },
  { prenom: 'Benjamin', nom: 'Dubois', poste: 'defenseur_central', naissance: '2003-08-14' },
  { prenom: 'Nathan', nom: 'Besse', poste: 'defenseur_central', naissance: '2004-02-18' },
  { prenom: 'Lucas', nom: 'Piquerel', poste: 'defenseur_central', naissance: '2002-11-11' },
  { prenom: 'Nicolas', nom: 'Paciel', poste: 'defenseur_central', naissance: '2000-02-15' },
  { prenom: 'Josué', nom: 'Paye', poste: 'defenseur_central', naissance: '1999-02-10' },
  { prenom: 'Paul', nom: 'Clément', poste: 'lateral_gauche', naissance: '1999-03-23' },
  { prenom: 'Pierre', nom: 'Pène-Tobler', poste: 'lateral_gauche', naissance: '2000-06-14' },
  { prenom: 'Loïc', nom: 'Benquet', poste: 'lateral_gauche', naissance: '2001-01-29' },
  { prenom: 'Marius', nom: 'Feuillet', poste: 'lateral_droit', naissance: '2006-07-21' },
  { prenom: 'Lucas', nom: 'Merzaud', poste: 'lateral_droit', naissance: '2003-06-30' },
  { prenom: 'Oliver', nom: 'Bonnin', poste: 'milieu_defensif', naissance: '2000-01-09' },
  { prenom: 'Aurélien', nom: 'Torregrosa', poste: 'milieu_central', naissance: '2000-02-23' },
  { prenom: 'Yannis', nom: 'Barji', poste: 'milieu_central', naissance: '2003-02-14' },
  { prenom: 'Dylan', nom: 'Rozier', poste: 'milieu_central', naissance: '1999-05-14' },
  { prenom: 'Junah', nom: 'Zuccolotto', poste: 'milieu_defensif', naissance: '2003-03-10' },
  { prenom: 'Adam', nom: 'Mohamed-Vaubois', poste: 'milieu_offensif', naissance: '2001-08-10' },
  { prenom: 'Alexis', nom: 'Moreau', poste: 'milieu_offensif', naissance: '1999-03-11' },
  { prenom: 'Marius', nom: 'Castant', poste: 'milieu_offensif', naissance: '2004-08-26' },
  { prenom: 'Joris', nom: 'Ahlinvi', poste: 'ailier_gauche', naissance: '1995-07-13' },
  { prenom: 'Jessy', nom: 'Lerouge', poste: 'ailier_droit', naissance: '2001-11-17' },
  { prenom: 'Yacine', nom: 'Boulem', poste: 'attaquant', naissance: '1997-10-20' },
  { prenom: 'Sekou', nom: 'Sidya Keita', poste: 'attaquant', naissance: '2003-02-02' },
  { prenom: 'Matisse', nom: 'Merino', poste: 'attaquant', naissance: '1998-10-15' },
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
