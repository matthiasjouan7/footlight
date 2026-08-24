// Ajoute les joueurs manquants de l'effectif Les Genêts d'Anglet
// (National 2 groupe A, saison 2026-2027) fourni par l'utilisateur
// (capture d'écran type transfermarkt). Reproduit le chemin "ajout
// manuel/scouté" de footlight-recherche.html (email synthétique
// @scoute.footlight.fr, profil non public, badge déclaratif) — pas de
// compte auth créé.
//
// club = "Anglet Genêts Foot" plutôt que "Les Genêts d'Anglet" (titre de
// la capture) : calendrier_officiel utilise "Anglet Genets Foot 1", et
// l'apostrophe de "d'Anglet" se transforme en mot séparé "d" après
// normalisation, ce qui casse le rapprochement club dans
// generer-calendriers-existants.js (clubWordsMatch) — même précaution que
// pour Rodez AF 2/Pau FC 2.
//
// "Défense" (sans précision) mappé sur defenseur_central, "Milieu" (sans
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

const CLUB = 'Anglet Genêts Foot';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF LES GENÊTS D'ANGLET", 26/27).
const EFFECTIF = [
  { prenom: 'Thomas', nom: 'Secchi', poste: 'gardien', naissance: '1997-06-19' },
  { prenom: 'Lucas', nom: 'Giffard', poste: 'gardien', naissance: '1998-01-03' },
  { prenom: 'Eneko', nom: 'Feltrin', poste: 'gardien', naissance: '2004-04-24' },
  { prenom: 'Valentin', nom: 'Da Ros', poste: 'gardien', naissance: '1996-10-23' },
  { prenom: 'Ibrahim', nom: 'Taounti', poste: 'defenseur_central', naissance: '1999-04-16' },
  { prenom: 'Malick', nom: 'Diane Gastdorf', poste: 'defenseur_central', naissance: '2004-12-10' },
  { prenom: 'Milo', nom: 'Redonnet', poste: 'defenseur_central', naissance: '2008-06-14' },
  { prenom: 'Bixente', nom: 'Mendiburu', poste: 'defenseur_central', naissance: '1994-09-29' },
  { prenom: 'Dorian', nom: 'Chailleux', poste: 'lateral_gauche', naissance: '2000-07-14' },
  { prenom: 'Lilian', nom: 'de Palmas', poste: 'lateral_gauche', naissance: '2002-02-02' },
  { prenom: 'Enzo', nom: 'Martinez', poste: 'lateral_gauche', naissance: '2005-06-14' },
  { prenom: 'Florian', nom: 'Becaas', poste: 'lateral_droit', naissance: '1995-09-15' },
  { prenom: 'Valentin', nom: 'Picoulet', poste: 'lateral_droit', naissance: '2006-09-18' },
  { prenom: 'Tomás', nom: 'Müller', poste: 'lateral_droit', naissance: '2006-05-30' },
  { prenom: 'Nicolas', nom: 'Hervy', poste: 'milieu_defensif', naissance: '1996-04-23' },
  { prenom: 'Enzo', nom: 'Daguerre', poste: 'milieu_central', naissance: '2004-03-02' },
  { prenom: 'Mathis', nom: 'Lapeyre', poste: 'milieu_defensif', naissance: '2005-01-10' },
  { prenom: 'Lucas', nom: 'Laplace-Palette', poste: 'milieu_central', naissance: '1996-02-09' },
  { prenom: 'Thibault', nom: 'Lapeyre', poste: 'milieu_offensif', naissance: '2001-05-31' },
  { prenom: 'Tom', nom: 'Tidas', poste: 'milieu_offensif', naissance: '1998-08-14' },
  { prenom: 'Hugo', nom: 'Dellas', poste: 'milieu_offensif', naissance: '2003-01-15' },
  { prenom: 'Endika', nom: 'Jiménez', poste: 'ailier_droit', naissance: '2004-11-18' },
  { prenom: 'Jason', nom: 'Luanda', poste: 'attaquant', naissance: '1992-12-24' },
  { prenom: 'Xan', nom: 'Daguerre', poste: 'attaquant', naissance: '2004-02-14' },
  { prenom: 'Quentin', nom: 'Soules', poste: 'attaquant', naissance: '2000-04-10' },
  { prenom: 'Liam', nom: 'Poirier', poste: 'attaquant', naissance: '2005-11-29' },
  { prenom: 'Lucas', nom: 'Canonge', poste: 'attaquant', naissance: '2004-06-02' },
  { prenom: 'Matis', nom: 'Tait', poste: 'attaquant', naissance: '2000-11-26' },
  { prenom: 'Jimmy', nom: 'Estève', poste: 'attaquant', naissance: '1999-02-05' },
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
