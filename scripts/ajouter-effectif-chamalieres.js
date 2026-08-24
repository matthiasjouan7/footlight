// Ajoute les joueurs manquants de l'effectif FC Chamalières (National 2
// groupe A, saison 2026-2027) fourni par l'utilisateur (capture d'écran
// type transfermarkt). Reproduit le chemin "ajout manuel/scouté" de
// footlight-recherche.html (email synthétique @scoute.footlight.fr,
// profil non public, badge déclaratif) — pas de compte auth créé.
//
// Postes génériques de la source ("Défense", "Milieu") mappés sur
// defenseur_central/milieu_central par défaut faute de précision.
// "Milieu gauche" (absent de l'enum poste de l'app) mappé sur
// ailier_gauche, comme pour l'effectif Blagnac FC.
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

const CLUB = 'FC Chamalières';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF FC CHAMALIÈRES", 26/27).
const EFFECTIF = [
  { prenom: 'Quentin', nom: 'Odin', poste: 'gardien', naissance: '2001-02-12' },
  { prenom: 'Simon', nom: 'Roche', poste: 'gardien', naissance: '1992-10-17' },
  { prenom: 'Maxime', nom: 'Merle', poste: 'gardien', naissance: '2003-03-02' },
  { prenom: 'Vinsy', nom: 'Moukambou', poste: 'gardien', naissance: '2007-12-27' },
  { prenom: 'Elio', nom: 'Lage', poste: 'defenseur_central', naissance: '2004-10-04' },
  { prenom: 'Léo', nom: 'Courteix', poste: 'defenseur_central', naissance: '2006-05-01' },
  { prenom: 'Luca', nom: 'Géry', poste: 'defenseur_central', naissance: '1997-10-06' },
  { prenom: 'Jordan', nom: 'Nauche', poste: 'lateral_gauche', naissance: '2000-04-18' },
  { prenom: 'Axel', nom: 'Gas', poste: 'lateral_gauche', naissance: '2004-02-29' },
  { prenom: 'Mathieu', nom: 'Mrdenovic', poste: 'lateral_gauche', naissance: '1996-08-02' },
  { prenom: 'Jocelyn', nom: 'Guehennec', poste: 'lateral_droit', naissance: '1996-03-09' },
  { prenom: 'Kévin', nom: 'Bouvier', poste: 'lateral_droit', naissance: '1993-11-29' },
  { prenom: 'Antoine', nom: 'Couderc', poste: 'milieu_defensif', naissance: '1994-06-13' },
  { prenom: 'Anthony', nom: 'Rance', poste: 'milieu_defensif', naissance: '1996-09-22' },
  { prenom: 'Lucas', nom: 'Pires', poste: 'milieu_defensif', naissance: '1999-03-31' },
  { prenom: 'Louis', nom: 'Bonneton', poste: 'milieu_central', naissance: '2006-02-27' },
  { prenom: 'Sofien', nom: 'Benbachir', poste: 'milieu_central', naissance: '1995-02-18' },
  { prenom: 'Karim', nom: 'El Kouasma', poste: 'milieu_central', naissance: '2002-04-26' },
  { prenom: 'Lilian', nom: 'Aymard', poste: 'ailier_gauche', naissance: '1999-03-20' },
  { prenom: 'Romain', nom: 'Laleuf', poste: 'milieu_offensif', naissance: '2002-01-26' },
  { prenom: 'Mathias', nom: 'Cussac', poste: 'attaquant', naissance: '1999-03-16' },
  { prenom: 'Colas', nom: 'Chastang', poste: 'attaquant', naissance: '2005-01-15' },
  { prenom: "N'Fa Herba", nom: 'Dramé', poste: 'attaquant', naissance: '1998-05-19' },
  { prenom: 'Noah', nom: 'Balenda', poste: 'attaquant', naissance: '2003-10-29' },
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
