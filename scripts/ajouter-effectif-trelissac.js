// Ajoute les joueurs manquants de l'effectif Trélissac FC (National 2
// groupe A, saison 2026-2027) fourni par l'utilisateur (capture d'écran
// type transfermarkt). Reproduit le chemin "ajout manuel/scouté" de
// footlight-recherche.html (email synthétique @scoute.footlight.fr, profil
// non public, badge déclaratif) — pas de compte auth créé.
//
// club = "Trélissac FC" : calendrier_officiel utilise "Trelissac Apfc 1"
// (vérifié via diagnostic-club-trelissac.js), mais le mot "trelissac" seul
// suffit au rapprochement via clubWordsMatch (generer-calendriers-
// existants.js), donc pas besoin d'un nom spécial comme pour Rodez/Pau/
// Anglet/Cestas.
//
// "Arrière gauche"/"Arrière droit" mappés sur lateral_gauche/lateral_droit,
// "Milieu" (sans précision) sur milieu_central, "Avant-centre" sur
// attaquant, comme pour les effectifs précédents.
//
// Naissance inconnue sur la capture (Avetik Davtian, Baptiste Floquet,
// Valentin Bourdarie) : naissance: null.
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

const CLUB = 'Trélissac FC';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF TRÉLISSAC FC", 26/27).
const EFFECTIF = [
  { prenom: 'Baptiste', nom: 'Cappelier', poste: 'gardien', naissance: '2000-03-19' },
  { prenom: 'Pierre', nom: 'Portets', poste: 'gardien', naissance: '1994-09-16' },
  { prenom: 'Noa', nom: 'Charrieras', poste: 'gardien', naissance: '2003-09-22' },
  { prenom: 'Alioune', nom: 'Camara', poste: 'defenseur_central', naissance: '1997-08-09' },
  { prenom: 'Dylan', nom: 'Milandou', poste: 'defenseur_central', naissance: '1998-12-29' },
  { prenom: 'Matteo', nom: 'Rodriguez', poste: 'defenseur_central', naissance: '2004-10-19' },
  { prenom: 'Maxime', nom: 'Sieffert', poste: 'lateral_gauche', naissance: '2002-12-16' },
  { prenom: 'Dorian', nom: 'Boyer', poste: 'lateral_gauche', naissance: '2006-12-03' },
  { prenom: 'Tao', nom: 'Jeammet', poste: 'lateral_droit', naissance: '2001-07-31' },
  { prenom: 'Mattéo', nom: 'Couget', poste: 'lateral_droit', naissance: '2002-08-19' },
  { prenom: 'Eimyn', nom: 'Diane', poste: 'milieu_defensif', naissance: '2001-08-16' },
  { prenom: 'Cheick', nom: 'Keita', poste: 'milieu_defensif', naissance: '2000-10-30' },
  { prenom: 'Anthony', nom: 'Eustache', poste: 'milieu_central', naissance: '1994-12-15' },
  { prenom: 'Avetik', nom: 'Davtian', poste: 'milieu_central', naissance: null },
  { prenom: 'Omar', nom: 'Mellity', poste: 'milieu_central', naissance: '2005-04-30' },
  { prenom: 'Mathys', nom: 'Guillaumeau', poste: 'milieu_offensif', naissance: '2005-01-14' },
  { prenom: 'Baptiste', nom: 'Floquet', poste: 'milieu_offensif', naissance: null },
  { prenom: 'Nathan', nom: 'Moineau', poste: 'ailier_gauche', naissance: '2006-10-30' },
  { prenom: 'Wilfried', nom: 'Baana Jaba', poste: 'attaquant', naissance: '1992-08-29' },
  { prenom: 'Jordan', nom: 'Pothier', poste: 'attaquant', naissance: '2001-02-09' },
  { prenom: 'Alaeddin', nom: 'Miloudi', poste: 'attaquant', naissance: '2002-09-11' },
  { prenom: 'Pierre', nom: 'Naidon', poste: 'attaquant', naissance: '2004-02-15' },
  { prenom: 'Doriann', nom: 'Brault', poste: 'attaquant', naissance: '2001-06-30' },
  { prenom: 'Valentin', nom: 'Bourdarie', poste: 'attaquant', naissance: null },
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
  console.log(`${j.prenom} ${j.nom} : à créer (${j.poste}, ${CLUB}, né(e) ${j.naissance || '—'}).`);
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
