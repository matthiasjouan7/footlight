// Ajoute les joueurs manquants de l'effectif Amiens SC (Ligue 3, saison
// 2026-2027) fourni par l'utilisateur (capture d'écran type transfermarkt).
// Même chemin que ajouter-effectif-bastia.js / ajouter-effectif-
// versailles.js / ajouter-effectif-caen.js.
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

const CLUB = 'Amiens SC';
const NIVEAU = 'Ligue 3';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF AMIENS SC", 26/27).
const EFFECTIF = [
  { prenom: 'Yannick', nom: 'Pandor', poste: 'gardien', naissance: '2001-05-01' },
  { prenom: 'Victor', nom: 'Delins', poste: 'gardien', naissance: '2000-03-09' },
  { prenom: 'Calvin', nom: 'Obin', poste: 'gardien', naissance: '2006-03-19' },
  { prenom: 'Adrien', nom: 'Julloux', poste: 'defenseur_central', naissance: '1996-10-05' },
  { prenom: 'Thomas', nom: 'Monconduit', poste: 'defenseur_central', naissance: '1991-02-10' },
  { prenom: 'Keny', nom: 'Mbala', poste: 'defenseur_central', naissance: '2004-06-02' },
  { prenom: 'Lucas', nom: 'Llort', poste: 'defenseur_central', naissance: '1999-06-08' },
  { prenom: 'Enzo', nom: 'Couto', poste: 'defenseur_central', naissance: '2003-07-14' },
  { prenom: 'Mamadou', nom: 'Camara', poste: 'defenseur_central', naissance: '2008-05-29' },
  { prenom: 'Dan', nom: 'Sinaté', poste: 'lateral_gauche', naissance: '2006-06-09' },
  { prenom: 'Nolan', nom: 'Hérissé', poste: 'lateral_gauche', naissance: '2004-12-23' },
  { prenom: 'Amine', nom: 'Chabane', poste: 'lateral_droit', naissance: '2006-08-15' },
  { prenom: 'Anthony', nom: 'Ribelin', poste: 'lateral_droit', naissance: '1996-04-08' },
  { prenom: 'Nathan', nom: 'Talbot', poste: 'lateral_droit', naissance: '2007-09-12' },
  { prenom: 'Antoine', nom: 'Nuss', poste: 'lateral_droit', naissance: '2003-12-19' },
  { prenom: 'Rémy', nom: 'Boissier', poste: 'milieu_defensif', naissance: '1994-02-22' },
  { prenom: 'Gatien', nom: 'Foll', poste: 'milieu_defensif', naissance: '2003-07-28' },
  { prenom: 'Cazim', nom: 'Suljic', poste: 'milieu_central', naissance: '1996-10-29' },
  { prenom: 'Oscar', nom: 'Aïssat', poste: 'milieu_central', naissance: '2007-02-15' },
  { prenom: 'Alexis', nom: 'Giacomini', poste: 'milieu_central', naissance: '1998-08-09' },
  { prenom: 'Enzo', nom: 'Somon', poste: 'milieu_offensif', naissance: '2008-04-15' },
  { prenom: 'Messy', nom: 'Manitu', poste: 'milieu_offensif', naissance: '2006-01-05' },
  { prenom: 'Côme', nom: 'Fromager', poste: 'milieu_offensif', naissance: '2003-08-08' },
  { prenom: 'Zourab', nom: 'Sopromadze', poste: 'milieu_offensif', naissance: '2002-03-22' },
  { prenom: 'Ely', nom: 'Julien', poste: 'ailier_droit', naissance: '2002-09-15' },
  { prenom: 'Yanis', nom: 'Rafii', poste: 'attaquant', naissance: '2005-06-26' },
  { prenom: 'Marvin', nom: 'Adélaïde', poste: 'attaquant', naissance: '1996-12-14' },
  { prenom: 'Mathis', nom: 'Colin', poste: 'attaquant', naissance: '2002-04-24' },
  { prenom: 'Alvin', nom: 'Doucet', poste: 'attaquant', naissance: '2003-05-21' },
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
