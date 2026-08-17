// Ajoute les joueurs manquants de l'effectif US Orléans (Ligue 3, saison
// 2026-2027) fourni par l'utilisateur (capture d'écran type transfermarkt).
// Même chemin que les scripts précédents (Bastia, Versailles, Caen,
// Amiens, Valenciennes).
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

const CLUB = 'US Orléans';
const NIVEAU = 'Ligue 3';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF US ORLÉANS", 26/27).
const EFFECTIF = [
  { prenom: 'Fei-Hong', nom: 'Faham', poste: 'gardien', naissance: '2001-08-01' },
  { prenom: 'Stéphan', nom: 'Moussima', poste: 'gardien', naissance: '1992-04-24' },
  { prenom: 'Matisse', nom: 'Morville', poste: 'gardien', naissance: '2005-09-07' },
  { prenom: 'Marius', nom: 'Lemaître', poste: 'defenseur_central', naissance: '2003-11-27' },
  { prenom: 'Mamadou', nom: 'Sylla', poste: 'defenseur_central', naissance: '1995-06-28' },
  { prenom: 'Jimmy', nom: 'Giraudon', poste: 'defenseur_central', naissance: '1992-01-16' },
  { prenom: 'Sidney', nom: 'Obissa', poste: 'defenseur_central', naissance: '2000-05-04' },
  { prenom: 'Enzo', nom: 'Balenga', poste: 'defenseur_central', naissance: '2003-05-15' },
  { prenom: 'Boubacar', nom: 'Diakhaby', poste: 'lateral_gauche', naissance: '2002-04-26' },
  { prenom: 'Johann', nom: 'Obiang', poste: 'lateral_gauche', naissance: '1993-07-05' },
  { prenom: 'Mathéo', nom: 'Guiheneuf', poste: 'lateral_droit', naissance: '2006-12-21' },
  { prenom: 'Lilian', nom: 'Raillot', poste: 'milieu_defensif', naissance: '2004-05-19' },
  { prenom: 'Hugo', nom: 'Aubourg', poste: 'milieu_defensif', naissance: '2003-02-03' },
  { prenom: 'Youness', nom: 'Aouladzian', poste: 'milieu_defensif', naissance: '1998-01-14' },
  { prenom: 'Guillaume', nom: 'Khous', poste: 'milieu_central', naissance: '1992-08-18' },
  { prenom: 'Mamadou', nom: 'Diako', poste: 'milieu_offensif', naissance: '2003-10-27' },
  { prenom: 'Belkacem', nom: 'Dali-Amar', poste: 'milieu_offensif', naissance: '1998-07-10' },
  { prenom: 'Grégory', nom: 'Berthier', poste: 'milieu_offensif', naissance: '1995-11-11' },
  { prenom: 'Adham', nom: 'Ribeiro', poste: 'milieu_offensif', naissance: '2004-09-26' },
  { prenom: 'Idrissa', nom: 'Seydi', poste: 'attaquant', naissance: '1998-09-28' },
  { prenom: 'Mondy', nom: 'Prunier', poste: 'attaquant', naissance: '1999-12-22' },
  { prenom: 'Robin', nom: 'Legendre', poste: 'attaquant', naissance: '2002-04-03' },
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
