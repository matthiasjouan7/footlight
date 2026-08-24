// Ajoute les joueurs manquants de l'effectif US Lège Cap-Ferret (National 2
// groupe A, saison 2026-2027) fourni par l'utilisateur (capture d'écran
// type transfermarkt). Reproduit le chemin "ajout manuel/scouté" de
// footlight-recherche.html (email synthétique @scoute.footlight.fr, profil
// non public, badge déclaratif) — pas de compte auth créé.
//
// club = "US Lège Cap-Ferret" : calendrier_officiel utilise "Lege Cap
// Ferret Us 1" (vérifié via diagnostic-club-lege.js) — mêmes mots
// (lege/cap/ferret) après normalisation, donc rapprochement direct sans
// nom spécial via clubWordsMatch (generer-calendriers-existants.js).
//
// "Défense" (sans précision) mappé sur defenseur_central, "Arrière droit"
// sur lateral_droit, "Milieu" (sans précision) sur milieu_central,
// "Avant-centre" sur attaquant, comme pour les effectifs précédents.
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

const CLUB = 'US Lège Cap-Ferret';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF US LÈGE CAP-FERRET", 26/27).
const EFFECTIF = [
  { prenom: 'Esteban', nom: 'Veies', poste: 'gardien', naissance: '2004-10-29' },
  { prenom: 'Noa', nom: 'Phejos', poste: 'gardien', naissance: '2005-11-09' },
  { prenom: 'Timéo', nom: 'Martins', poste: 'gardien', naissance: '2008-07-05' },
  { prenom: 'Tristan', nom: 'Lafon', poste: 'defenseur_central', naissance: '1999-02-09' },
  { prenom: 'Louis', nom: 'Boudin', poste: 'defenseur_central', naissance: '2004-01-07' },
  { prenom: 'Yanis', nom: 'El Madi', poste: 'defenseur_central', naissance: '2003-05-06' },
  { prenom: 'Gabriel', nom: 'Lecaille', poste: 'defenseur_central', naissance: '2004-03-03' },
  { prenom: 'Léo', nom: 'Lemoine', poste: 'defenseur_central', naissance: '2001-05-18' },
  { prenom: 'Quentin', nom: 'Gallice', poste: 'defenseur_central', naissance: '2004-07-08' },
  { prenom: 'Bourama', nom: 'Dembélé', poste: 'defenseur_central', naissance: '1998-06-20' },
  { prenom: 'Alexis', nom: 'Martial', poste: 'lateral_droit', naissance: '2001-06-15' },
  { prenom: 'Julius', nom: 'Insa', poste: 'milieu_defensif', naissance: '2002-04-12' },
  { prenom: 'Thomas', nom: 'Penalva', poste: 'milieu_central', naissance: '1999-08-05' },
  { prenom: 'Killian', nom: 'Castaignede', poste: 'milieu_central', naissance: '2005-01-16' },
  { prenom: 'Léo', nom: 'Gleyze', poste: 'milieu_central', naissance: '2004-05-04' },
  { prenom: 'Kainoa', nom: 'Bodin', poste: 'milieu_central', naissance: '2003-08-12' },
  { prenom: 'Romain', nom: 'Renard', poste: 'milieu_central', naissance: '1998-04-25' },
  { prenom: 'Noah', nom: 'Aprile', poste: 'milieu_central', naissance: '2006-03-06' },
  { prenom: 'Mathias', nom: 'Serin', poste: 'milieu_offensif', naissance: '1991-08-01' },
  { prenom: 'Lhoan', nom: 'Claudant', poste: 'ailier_gauche', naissance: '2003-12-15' },
  { prenom: 'Sofiane', nom: 'Achour', poste: 'ailier_gauche', naissance: '2006-11-06' },
  { prenom: 'Lucas', nom: 'Rocrou', poste: 'attaquant', naissance: '2003-03-27' },
  { prenom: 'Mathéo', nom: 'Eppert', poste: 'attaquant', naissance: '1997-06-24' },
  { prenom: 'Thibault', nom: 'Le Beux', poste: 'attaquant', naissance: '2004-02-19' },
  { prenom: 'Hamidou', nom: 'Yameogo', poste: 'attaquant', naissance: '2002-03-22' },
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
