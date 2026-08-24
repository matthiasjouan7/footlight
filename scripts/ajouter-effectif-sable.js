// Ajoute les joueurs manquants de l'effectif Sablé-sur-Sarthe FC (National
// 2, saison 2026-2027) fourni par l'utilisateur (capture d'écran type
// transfermarkt). Reproduit le chemin "ajout manuel/scouté" de
// footlight-recherche.html (email synthétique @scoute.footlight.fr, profil
// non public, badge déclaratif) — pas de compte auth créé.
//
// club = "Sablé-sur-Sarthe FC" : calendrier_officiel utilise "Sable Fc 1"
// (vérifié via diagnostic-club-sable.js), mais le mot "sable" seul suffit
// au rapprochement via clubWordsMatch (generer-calendriers-existants.js).
// Un autre club N2 distinct, "Les Sables Vf" (Les Sables Vendée Football),
// contient aussi "sable" mais au pluriel ("sables" ≠ "sable" mot pour
// mot) — pas de confusion possible.
//
// "Milieu droit" (absent de l'enum poste de l'app) mappé sur ailier_droit,
// comme pour Blagnac FC / FC Chamalières / Le Mans FC B. "Avant-centre"
// sur attaquant, comme pour les effectifs précédents.
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

const CLUB = 'Sablé-sur-Sarthe FC';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF SABLÉ-SUR-SARTHE FC",
// 26/27).
const EFFECTIF = [
  { prenom: 'Macéo', nom: 'Sow', poste: 'gardien', naissance: '2002-02-14' },
  { prenom: 'Olivan', nom: 'Genard', poste: 'gardien', naissance: '2008-10-09' },
  { prenom: 'Corentin', nom: 'Guiet', poste: 'defenseur_central', naissance: '1998-03-09' },
  { prenom: 'Ryan', nom: 'Ebene Talla', poste: 'defenseur_central', naissance: '1999-10-21' },
  { prenom: 'Hamet', nom: 'Coulibaly', poste: 'lateral_gauche', naissance: '1998-04-22' },
  { prenom: 'Antoine', nom: 'Bretonnière', poste: 'lateral_gauche', naissance: '2000-01-27' },
  { prenom: 'Djekou', nom: 'Bro', poste: 'lateral_gauche', naissance: '2004-06-01' },
  { prenom: 'Baptiste', nom: 'Foucault', poste: 'lateral_droit', naissance: '1997-08-20' },
  { prenom: 'Lucas', nom: 'Davy', poste: 'lateral_droit', naissance: '2005-02-25' },
  { prenom: 'Tom', nom: 'Voirin', poste: 'milieu_defensif', naissance: '2002-01-29' },
  { prenom: 'Florian', nom: 'Deschamps', poste: 'milieu_central', naissance: '2004-03-17' },
  { prenom: 'Enzo', nom: 'Bellouti', poste: 'milieu_central', naissance: '2007-01-21' },
  { prenom: 'Maxence', nom: 'Abran', poste: 'ailier_droit', naissance: '2004-01-27' },
  { prenom: 'Armand', nom: 'Gillet', poste: 'milieu_offensif', naissance: '2005-02-17' },
  { prenom: 'Florian', nom: 'Monnier', poste: 'ailier_droit', naissance: '1999-09-07' },
  { prenom: 'Junior', nom: 'Kadidi', poste: 'ailier_droit', naissance: '2006-10-10' },
  { prenom: 'Yanne', nom: 'Nowa', poste: 'attaquant', naissance: '2000-07-24' },
  { prenom: 'Mathieu', nom: 'Desmarres', poste: 'attaquant', naissance: '1999-01-11' },
  { prenom: 'Mamoudou', nom: 'Daramy', poste: 'attaquant', naissance: '2000-09-08' },
  { prenom: 'Nadjib', nom: 'Souazara Anzizi', poste: 'attaquant', naissance: '1996-03-10' },
  { prenom: 'Steven', nom: 'Ngampika', poste: 'attaquant', naissance: '1999-09-24' },
  { prenom: 'Dymilan', nom: 'Selbonne', poste: 'attaquant', naissance: '2000-10-17' },
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
