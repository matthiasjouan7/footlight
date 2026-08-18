// Ajoute les joueurs manquants de l'effectif US Concarneau (Ligue 3,
// saison 2026-2027) fourni par l'utilisateur (capture d'écran type
// transfermarkt). Même chemin que les scripts précédents (Bastia,
// Versailles, Caen, Amiens, Valenciennes, Orléans, Fleury, Villefranche).
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

const CLUB = 'US Concarneau';
const NIVEAU = 'Ligue 3';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF US CONCARNEAU", 26/27).
const EFFECTIF = [
  { prenom: 'Vincent', nom: 'Viot', poste: 'gardien', naissance: '1994-05-17' },
  { prenom: 'Pierre', nom: 'Patron', poste: 'gardien', naissance: '1997-08-20' },
  { prenom: 'Valentin', nom: 'Cenatiempo', poste: 'gardien', naissance: '2005-06-25' },
  { prenom: 'Djessine', nom: 'Seba', poste: 'defenseur_central', naissance: '1994-08-08' },
  { prenom: 'Demba', nom: 'Yatera', poste: 'defenseur_central', naissance: '2002-06-08' },
  { prenom: 'Charles', nom: 'Divialle-Corbière', poste: 'defenseur_central', naissance: '2004-02-09' },
  { prenom: 'Baptiste', nom: 'Etcheverria', poste: 'lateral_gauche', naissance: '1997-04-09' },
  { prenom: 'Sacha', nom: 'Inquel', poste: 'lateral_gauche', naissance: '2004-01-30' },
  { prenom: 'Kaïs', nom: 'Benabdelouahed', poste: 'lateral_gauche', naissance: '2005-03-12' },
  { prenom: 'Jimmy', nom: 'Halby Touré', poste: 'lateral_droit', naissance: '1997-02-07' },
  { prenom: 'Grégory', nom: 'Lafontaine', poste: 'lateral_droit', naissance: '2003-09-13' },
  { prenom: 'Thibault', nom: 'Sinquin', poste: 'milieu_defensif', naissance: '1992-05-26' },
  { prenom: 'Raimane', nom: 'Daou', poste: 'milieu_defensif', naissance: '2004-11-20' },
  { prenom: 'Glenn', nom: 'Hocquet', poste: 'milieu_defensif', naissance: '2006-11-23' },
  { prenom: 'Mathis', nom: 'Picouleau', poste: 'milieu_central', naissance: '2000-05-08' },
  { prenom: 'Loïc', nom: 'Goujon', poste: 'milieu_central', naissance: '1996-01-09' },
  { prenom: 'Garland', nom: 'Gbellé', poste: 'milieu_central', naissance: '1992-12-16' },
  { prenom: 'Baptiste', nom: 'Macon', poste: 'ailier_gauche', naissance: '2004-05-12' },
  { prenom: 'Flavio', nom: 'Da Silva', poste: 'milieu_offensif', naissance: '2001-03-04' },
  { prenom: 'Lucas', nom: 'Rosier', poste: 'ailier_gauche', naissance: '2007-03-12' },
  { prenom: 'Nicolas', nom: 'Mercier', poste: 'ailier_gauche', naissance: '2003-01-30' },
  { prenom: 'Omar', nom: 'Daf', poste: 'ailier_droit', naissance: '2002-12-23' },
  { prenom: 'Aly', nom: 'Sidibé', poste: 'ailier_droit', naissance: '2005-01-25' },
  { prenom: 'Stan', nom: 'Janno', poste: 'attaquant', naissance: '2002-02-01' },
  { prenom: 'Mathéo', nom: 'Ntumi', poste: 'attaquant', naissance: '2005-08-30' },
  { prenom: 'Jules', nom: 'Varvat', poste: 'attaquant', naissance: '2000-10-18' },
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
