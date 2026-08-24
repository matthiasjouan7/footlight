// Ajoute les joueurs manquants de l'effectif AS La Châtaigneraie (National
// 2, saison 2026-2027) fourni par l'utilisateur (capture d'écran type
// transfermarkt). Reproduit le chemin "ajout manuel/scouté" de
// footlight-recherche.html (email synthétique @scoute.footlight.fr, profil
// non public, badge déclaratif) — pas de compte auth créé.
//
// club = "AS La Châtaigneraie" : calendrier_officiel utilise "La
// Chataigneraie As 1" (vérifié via diagnostic-club-chataigneraie.js), mais
// le mot "chataigneraie" seul suffit au rapprochement via clubWordsMatch
// (generer-calendriers-existants.js), donc pas besoin d'un nom spécial
// comme pour Cestas/Castanet/Chinon.
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

const CLUB = 'AS La Châtaigneraie';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF AS LA CHÂTAIGNERAIE",
// 26/27).
const EFFECTIF = [
  { prenom: 'Hugo', nom: 'Bretaigne', poste: 'gardien', naissance: '2000-02-08' },
  { prenom: 'Mattéo', nom: 'Cominges', poste: 'gardien', naissance: '1999-10-06' },
  { prenom: 'Servan', nom: 'Suignard', poste: 'defenseur_central', naissance: '2003-10-16' },
  { prenom: 'Lucas', nom: 'Brémond', poste: 'defenseur_central', naissance: '2002-12-13' },
  { prenom: 'Florian', nom: 'Burgaud', poste: 'defenseur_central', naissance: '2002-05-29' },
  { prenom: 'Andréa', nom: 'Heckel', poste: 'defenseur_central', naissance: '2007-03-02' },
  { prenom: 'Noah', nom: 'Talbot', poste: 'lateral_gauche', naissance: '2005-07-12' },
  { prenom: 'Romuald', nom: 'Marie', poste: 'lateral_droit', naissance: '1988-05-19' },
  { prenom: 'Loan', nom: 'Hochedez', poste: 'lateral_droit', naissance: '2005-07-12' },
  { prenom: 'Mathis', nom: 'Oger', poste: 'milieu_defensif', naissance: '2003-05-02' },
  { prenom: 'Bourhane', nom: 'Conté', poste: 'milieu_defensif', naissance: '2005-05-05' },
  { prenom: 'Evan', nom: 'Goret', poste: 'milieu_central', naissance: '2003-04-02' },
  { prenom: 'Lucas', nom: 'Abreu', poste: 'milieu_central', naissance: '2001-08-30' },
  { prenom: 'Sascha', nom: 'Touodop Tekeu', poste: 'ailier_gauche', naissance: '2005-01-11' },
  { prenom: 'Paul-Émile', nom: 'Mimault', poste: 'ailier_gauche', naissance: '2001-07-12' },
  { prenom: 'Samuel', nom: 'Biraud', poste: 'ailier_droit', naissance: '2002-07-22' },
  { prenom: 'Pierre', nom: 'Grellier', poste: 'attaquant', naissance: '1997-08-15' },
  { prenom: 'Charles', nom: 'Goyer', poste: 'attaquant', naissance: '2004-05-27' },
  { prenom: 'Hugo', nom: 'Bodin', poste: 'attaquant', naissance: '1999-08-02' },
  { prenom: 'Bastien', nom: 'Déchamps', poste: 'attaquant', naissance: '2003-03-20' },
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
