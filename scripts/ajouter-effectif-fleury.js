// Ajoute les joueurs manquants de l'effectif FC Fleury 91 (Ligue 3, saison
// 2026-2027) fourni par l'utilisateur (capture d'écran type transfermarkt).
// Même chemin que les scripts précédents (Bastia, Versailles, Caen,
// Amiens, Valenciennes, Orléans).
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

const CLUB = 'FC Fleury 91';
const NIVEAU = 'Ligue 3';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF FC FLEURY 91", 26/27).
const EFFECTIF = [
  { prenom: 'Gaël', nom: 'Alette', poste: 'gardien', naissance: '2001-04-27' },
  { prenom: 'Amine', nom: 'Boukemouche', poste: 'gardien', naissance: '2005-08-05' },
  { prenom: 'Antoine', nom: 'Petit', poste: 'gardien', naissance: '1991-06-27' },
  { prenom: 'Quentin', nom: 'Vogt', poste: 'defenseur_central', naissance: '1999-12-08' },
  { prenom: 'Hamadou', nom: 'Karamoko', poste: 'defenseur_central', naissance: '1995-10-31' },
  { prenom: 'Freddy', nom: 'Colombo', poste: 'defenseur_central', naissance: '1998-08-07' },
  { prenom: 'Thibaut', nom: 'Plisson', poste: 'lateral_gauche', naissance: '1998-08-17' },
  { prenom: 'Morgan', nom: 'Jean-Pierre', poste: 'lateral_gauche', naissance: '1992-10-30' },
  { prenom: 'Jovanie', nom: 'Tchouatcha', poste: 'lateral_gauche', naissance: '1994-09-05' },
  { prenom: 'Enzo', nom: 'Bovis', poste: 'lateral_droit', naissance: '1994-04-23' },
  { prenom: 'Heraba', nom: 'Gassama', poste: 'lateral_droit', naissance: '2007-07-19' },
  { prenom: 'Ali', nom: 'Rouba', poste: 'lateral_droit', naissance: '2003-09-05' },
  { prenom: 'Titouan', nom: 'Thomas', poste: 'milieu_central', naissance: '2002-01-12' },
  { prenom: 'Cyril', nom: 'Khetir', poste: 'milieu_central', naissance: '2001-02-28' },
  { prenom: 'Grégoire', nom: 'Lefebvre', poste: 'milieu_central', naissance: '1994-05-13' },
  { prenom: 'Romain', nom: 'Lelevé', poste: 'milieu_central', naissance: '1992-09-28' },
  { prenom: 'Franck', nom: 'Angong', poste: 'milieu_central', naissance: '2002-07-05' },
  { prenom: 'Nadir', nom: 'Homssa', poste: 'milieu_central', naissance: '2004-05-31' },
  { prenom: 'Clément', nom: 'Badin', poste: 'ailier_droit', naissance: '1993-05-26' },
  { prenom: 'Yoann', nom: 'Le Méhauté', poste: 'milieu_offensif', naissance: '1995-01-03' },
  { prenom: 'Yanis', nom: 'Verdier', poste: 'ailier_gauche', naissance: '2003-07-29' },
  { prenom: 'Marvyn', nom: 'Belliard', poste: 'ailier_droit', naissance: '1993-02-11' },
  { prenom: 'Kévin', nom: 'Farade', poste: 'attaquant', naissance: '1995-09-01' },
  { prenom: 'Souleymane', nom: 'Anne', poste: 'attaquant', naissance: '1997-12-05' },
  { prenom: 'Valentin', nom: 'Lavigne', poste: 'attaquant', naissance: '1994-06-04' },
  { prenom: 'Jonathan', nom: 'Rivas', poste: 'attaquant', naissance: '1992-01-25' },
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
