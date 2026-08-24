// Ajoute les joueurs manquants de l'effectif Onet-le-Château Football
// (National 2 groupe A, saison 2026-2027) fourni par l'utilisateur (capture
// d'écran type transfermarkt). Reproduit le chemin "ajout manuel/scouté" de
// footlight-recherche.html (email synthétique @scoute.footlight.fr, profil
// non public, badge déclaratif) — pas de compte auth créé.
//
// "Défense" (sans précision) mappé sur defenseur_central, "Arrière droit"
// sur lateral_droit, "Milieu" (sans précision) sur milieu_central,
// "Avant-centre" sur attaquant, comme pour les effectifs précédents.
//
// Nathan Verloo : naissance non affichée sur la capture (naissance: null).
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

const CLUB = 'Onet-le-Château Football';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF ONET-LE-CHÂTEAU FOOTBALL", 26/27).
const EFFECTIF = [
  { prenom: 'Jorys', nom: 'Mohimont', poste: 'gardien', naissance: '2001-06-01' },
  { prenom: 'Pierre', nom: 'Laborde-Turon', poste: 'gardien', naissance: '1995-03-30' },
  { prenom: 'Mathis', nom: 'Enjalbert', poste: 'gardien', naissance: '2004-04-18' },
  { prenom: 'Mathis', nom: 'Jalade', poste: 'gardien', naissance: '2007-04-11' },
  { prenom: 'Adrien', nom: 'Legroux', poste: 'defenseur_central', naissance: '2000-05-06' },
  { prenom: 'Hugo', nom: 'Schaab', poste: 'defenseur_central', naissance: '1996-07-26' },
  { prenom: 'Basile', nom: 'Delclaux', poste: 'defenseur_central', naissance: '1999-08-01' },
  { prenom: 'Hendrick', nom: 'Foucras', poste: 'defenseur_central', naissance: '1997-05-07' },
  { prenom: 'Evan', nom: 'Tarayre', poste: 'defenseur_central', naissance: '2004-02-18' },
  { prenom: 'Anis', nom: 'Didon', poste: 'lateral_droit', naissance: '2005-06-28' },
  { prenom: 'Pierre', nom: 'Ruffaut', poste: 'milieu_defensif', naissance: '1987-06-17' },
  { prenom: 'Hugo', nom: 'Bobek', poste: 'milieu_central', naissance: '1990-12-08' },
  { prenom: 'Yoan', nom: 'Choquet', poste: 'milieu_central', naissance: '2003-09-09' },
  { prenom: 'Elois', nom: 'Durand', poste: 'milieu_central', naissance: '2003-09-22' },
  { prenom: 'David', nom: 'Rico', poste: 'milieu_central', naissance: '2002-05-22' },
  { prenom: 'Tom', nom: 'Pouget', poste: 'milieu_central', naissance: '2005-02-08' },
  { prenom: 'Yanis', nom: 'El Baghdadi', poste: 'milieu_central', naissance: '1996-06-28' },
  { prenom: 'Axel', nom: 'Deplace', poste: 'milieu_central', naissance: '1998-10-13' },
  { prenom: 'Quentin', nom: 'Deneyrat', poste: 'milieu_central', naissance: '2004-12-10' },
  { prenom: 'Benjamin', nom: 'Higonenc', poste: 'milieu_central', naissance: '2003-05-13' },
  { prenom: 'Nathan', nom: 'Verloo', poste: 'milieu_offensif', naissance: null },
  { prenom: 'Grégory', nom: 'Assati', poste: 'ailier_droit', naissance: '2002-07-30' },
  { prenom: 'Bala', nom: 'Fofana', poste: 'attaquant', naissance: '1995-01-27' },
  { prenom: 'Théo', nom: 'Bastide', poste: 'attaquant', naissance: '2001-10-15' },
  { prenom: 'Théo', nom: 'Prunera', poste: 'attaquant', naissance: '2003-06-02' },
  { prenom: 'Gabin', nom: 'Barreau', poste: 'attaquant', naissance: '2002-01-11' },
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
