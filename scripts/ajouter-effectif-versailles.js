// Ajoute les joueurs manquants de l'effectif FC Versailles 78 (Ligue 3,
// saison 2026-2027) fourni par l'utilisateur (capture d'écran type
// transfermarkt). Même chemin que ajouter-effectif-bastia.js : "ajout
// manuel/scouté" de footlight-recherche.html (email synthétique
// @scoute.footlight.fr, profil non public, badge déclaratif).
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

const CLUB = 'FC Versailles 78';
const NIVEAU = 'Ligue 3';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF FC VERSAILLES 78", 26/27).
const EFFECTIF = [
  { prenom: 'Nathan', nom: 'Yavorsky', poste: 'gardien', naissance: '2001-06-19' },
  { prenom: 'Rubens', nom: 'Adélaïde', poste: 'gardien', naissance: '1998-12-15' },
  { prenom: 'Djibril', nom: 'Khouma', poste: 'defenseur_central', naissance: '2002-03-01' },
  { prenom: 'Ryan', nom: 'Tchato', poste: 'defenseur_central', naissance: '2004-09-13' },
  { prenom: 'Raphaël', nom: 'Calvet', poste: 'defenseur_central', naissance: '1994-02-07' },
  { prenom: 'Abdourahmane', nom: 'Barry', poste: 'defenseur_central', naissance: '2000-02-21' },
  { prenom: 'Ange', nom: 'Badey', poste: 'defenseur_central', naissance: '2003-06-14' },
  { prenom: 'Bilal', nom: 'Cissé', poste: 'defenseur_central', naissance: '2000-07-08' },
  { prenom: 'Mathias', nom: 'Fischer', poste: 'lateral_gauche', naissance: '1998-07-11' },
  { prenom: 'Deen', nom: 'Adehoumi', poste: 'lateral_gauche', naissance: '2005-03-15' },
  { prenom: 'Emric', nom: 'Goumot', poste: 'lateral_droit', naissance: '2003-09-14' },
  { prenom: 'Jérémi', nom: 'Santini', poste: 'lateral_droit', naissance: '1998-05-18' },
  { prenom: 'Kurtis', nom: 'Chadet', poste: 'lateral_droit', naissance: '2003-03-23' },
  { prenom: 'Romain', nom: 'Basque', poste: 'milieu_defensif', naissance: '1995-06-30' },
  { prenom: 'Ali', nom: 'Ouchen', poste: 'milieu_central', naissance: '2002-09-04' },
  { prenom: 'Jordan', nom: 'Leborgne', poste: 'milieu_central', naissance: '1995-09-29' },
  { prenom: 'Alexis', nom: 'Dos Santos', poste: 'milieu_central', naissance: '2001-11-13' },
  { prenom: 'Artur', nom: 'Zakharyan', poste: 'ailier_droit', naissance: '1997-08-14' },
  { prenom: 'Simon', nom: 'Cara', poste: 'milieu_offensif', naissance: '2005-03-31' },
  { prenom: 'Ismaël', nom: 'Aouad', poste: 'milieu_offensif', naissance: '2006-05-22' },
  { prenom: 'Alexis', nom: 'Kabamba', poste: 'ailier_droit', naissance: '2005-10-15' },
  { prenom: 'Amir', nom: 'Etien', poste: 'ailier_droit', naissance: '2001-10-18' },
  { prenom: 'Jawed', nom: 'Kalai', poste: 'ailier_droit', naissance: '2000-07-29' },
  { prenom: 'Shelton', nom: 'Guillaume', poste: 'attaquant', naissance: '1997-10-21' },
  { prenom: 'Cédric', nom: 'Odzoumo', poste: 'attaquant', naissance: '1995-05-25' },
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
