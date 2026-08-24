// Ajoute les joueurs manquants de l'effectif US Castanéenne (National 2
// groupe A, saison 2026-2027) fourni par l'utilisateur (capture d'écran
// type transfermarkt). Reproduit le chemin "ajout manuel/scouté" de
// footlight-recherche.html (email synthétique @scoute.footlight.fr, profil
// non public, badge déclaratif) — pas de compte auth créé.
//
// club = "US Castanet" plutôt que "US Castanéenne" (titre de la capture) :
// calendrier_officiel utilise "Castanet Us 1" (vérifié via
// diagnostic-club-castanet.js) — "Castanéenne" (adjectif) et "Castanet"
// (nom de la ville) ne partagent pas de mot commun après normalisation,
// ce qui casserait le rapprochement club dans generer-calendriers-
// existants.js (clubWordsMatch) — même précaution que pour Rodez AF 2/
// Pau FC 2/Anglet Genêts Foot/Cestas SAG.
//
// "Défense" (sans précision) mappé sur defenseur_central, "Arrière droit"
// sur lateral_droit, "Milieu" (sans précision) sur milieu_central, comme
// pour les effectifs précédents.
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

const CLUB = 'US Castanet';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF US CASTANÉENNE", 26/27).
const EFFECTIF = [
  { prenom: 'Sergi', nom: 'Tournié', poste: 'gardien', naissance: '2000-09-28' },
  { prenom: 'Léo', nom: 'Forchino', poste: 'defenseur_central', naissance: '2002-10-22' },
  { prenom: 'Mehdi', nom: 'Espada', poste: 'defenseur_central', naissance: '1997-02-24' },
  { prenom: 'Anthony', nom: 'Davaine', poste: 'defenseur_central', naissance: '2003-05-19' },
  { prenom: 'Grâce', nom: 'Dikuta Ebale', poste: 'lateral_droit', naissance: '2003-03-12' },
  { prenom: 'Tijany', nom: 'Atallah', poste: 'milieu_defensif', naissance: '2003-03-12' },
  { prenom: 'Maxan', nom: 'Bernat', poste: 'milieu_central', naissance: '1997-12-14' },
  { prenom: 'Benoît', nom: 'Commère', poste: 'milieu_defensif', naissance: '1999-07-18' },
  { prenom: 'Houcine', nom: 'Rabhi', poste: 'milieu_central', naissance: '2004-01-30' },
  { prenom: 'Thomas', nom: 'Mirouze', poste: 'milieu_central', naissance: '2000-02-09' },
  { prenom: 'Bilal', nom: 'El Harrani', poste: 'milieu_central', naissance: '2004-08-01' },
  { prenom: 'Enzo', nom: 'Militzer', poste: 'milieu_central', naissance: '2003-01-01' },
  { prenom: 'Annis', nom: 'Aouladchaib', poste: 'attaquant', naissance: '2000-11-18' },
  { prenom: 'Rémi', nom: 'Vaysse', poste: 'attaquant', naissance: '1994-01-22' },
  { prenom: 'Mehdi', nom: 'Rabhi', poste: 'attaquant', naissance: '2005-06-20' },
  { prenom: 'Maxence', nom: 'Villaescusa', poste: 'attaquant', naissance: '2004-12-17' },
  { prenom: 'Yassine', nom: 'Amara', poste: 'attaquant', naissance: '2006-10-25' },
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
