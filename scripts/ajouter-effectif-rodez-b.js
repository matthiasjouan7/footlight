// Ajoute les joueurs manquants de l'effectif Rodez Aveyron Football B
// (National 2 groupe A, saison 2026-2027) fourni par l'utilisateur
// (capture d'écran type transfermarkt). Reproduit le chemin "ajout
// manuel/scouté" de footlight-recherche.html (email synthétique
// @scoute.footlight.fr, profil non public, badge déclaratif) — pas de
// compte auth créé.
//
// club = "Rodez Af 2" (orthographe exacte de calendrier_officiel, division
// N2 groupe A) pour garantir le rapprochement club dans
// generer-calendriers-existants.js (clubWordsMatch) — "Rodez Aveyron
// Football B" ne matcherait pas ("af" vs "aveyron football" ne partagent
// aucun mot après filtrage des mots génériques).
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

const CLUB = 'Rodez Af 2';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF RODEZ AVEYRON FOOTBALL B", 26/27).
const EFFECTIF = [
  { prenom: 'Mathis', nom: 'Delebarre', poste: 'gardien', naissance: '2006-11-19' },
  { prenom: 'Stanislas', nom: 'Natiez', poste: 'gardien', naissance: '2007-02-02' },
  { prenom: 'Mae', nom: 'Toppan', poste: 'gardien', naissance: '2007-08-06' },
  { prenom: 'Hakim', nom: 'Basla', poste: 'defenseur_central', naissance: '2005-05-29' },
  { prenom: 'Mamadu', nom: 'Silla', poste: 'lateral_droit', naissance: '2006-11-30' },
  { prenom: 'Antoine', nom: 'Caubet', poste: 'milieu_defensif', naissance: '2005-03-12' },
  { prenom: 'Ali', nom: 'Kebbeh', poste: 'milieu_defensif', naissance: '2006-11-28' },
  { prenom: 'Anthonin', nom: 'Loriller', poste: 'milieu_defensif', naissance: '2005-12-29' },
  { prenom: 'Joshua', nom: 'Ndiefi', poste: 'milieu_central', naissance: '2007-03-26' },
  { prenom: 'Thibaut', nom: 'Pradel', poste: 'milieu_central', naissance: '2008-01-22' },
  { prenom: 'Yanis', nom: 'Dahalani', poste: 'milieu_central', naissance: '2005-02-23' },
  { prenom: 'Corentin', nom: 'Issanchou', poste: 'milieu_offensif', naissance: '2005-06-13' },
  { prenom: 'Lucas', nom: 'Boulet', poste: 'milieu_offensif', naissance: '2006-12-20' },
  { prenom: 'Djibril', nom: 'Mavounia', poste: 'ailier_gauche', naissance: '2006-01-21' },
  { prenom: 'Sophian', nom: 'Do Carmo', poste: 'ailier_droit', naissance: '2005-07-05' },
  { prenom: 'Jorys', nom: 'Martinez', poste: 'attaquant', naissance: '2004-08-19' },
  { prenom: 'Louis', nom: 'Bonnieu', poste: 'attaquant', naissance: '2006-03-18' },
  { prenom: 'Maexan', nom: 'Teyssedre', poste: 'attaquant', naissance: '2008-05-11' },
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
