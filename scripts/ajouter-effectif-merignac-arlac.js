// Ajoute les joueurs manquants de l'effectif FCE Mérignac-Arlac (National
// 2 groupe A, saison 2026-2027) fourni par l'utilisateur (capture d'écran
// type transfermarkt). Reproduit le chemin "ajout manuel/scouté" de
// footlight-recherche.html (email synthétique @scoute.footlight.fr,
// profil non public, badge déclaratif) — pas de compte auth créé.
//
// Poste générique "Milieu" (sans précision) mappé sur milieu_central,
// "Avant-centre" mappé sur attaquant, comme pour les effectifs précédents.
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

const CLUB = 'FCE Mérignac-Arlac';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF FCE MÉRIGNAC-ARLAC", 26/27).
const EFFECTIF = [
  { prenom: 'Julien', nom: 'Dupon', poste: 'gardien', naissance: '1999-07-05' },
  { prenom: 'Anseani', nom: 'Pohe Tokpa', poste: 'defenseur_central', naissance: '2000-03-19' },
  { prenom: 'Sam', nom: 'Herbert', poste: 'defenseur_central', naissance: '1997-03-19' },
  { prenom: 'Emmanuel', nom: 'Abbey', poste: 'defenseur_central', naissance: '2006-01-04' },
  { prenom: 'Baptiste', nom: 'Zanini', poste: 'defenseur_central', naissance: '1998-01-29' },
  { prenom: 'Peyo', nom: 'Dubourdieu', poste: 'defenseur_central', naissance: '2001-04-08' },
  { prenom: 'Daniel', nom: 'Jurado', poste: 'lateral_gauche', naissance: '2000-07-24' },
  { prenom: 'Enoch', nom: 'Simpore', poste: 'lateral_droit', naissance: '2005-01-18' },
  { prenom: 'Martin', nom: 'Dumas', poste: 'lateral_droit', naissance: '2005-09-25' },
  { prenom: 'Thomas', nom: 'Charruau', poste: 'milieu_central', naissance: '1993-01-15' },
  { prenom: 'Mohamed', nom: 'Tariqui', poste: 'milieu_defensif', naissance: '2002-03-31' },
  { prenom: 'Nathan', nom: 'Bouchon', poste: 'milieu_central', naissance: '1998-06-07' },
  { prenom: 'Dylan', nom: 'Kambala', poste: 'milieu_central', naissance: '2000-08-19' },
  { prenom: 'Arthur', nom: 'Gervais', poste: 'milieu_defensif', naissance: '2007-02-15' },
  { prenom: 'Rayan', nom: 'Fathalli', poste: 'milieu_central', naissance: '2004-09-19' },
  { prenom: 'Jules', nom: 'Huguet', poste: 'milieu_central', naissance: '2001-11-11' },
  { prenom: 'Marley', nom: 'Rasidimanana', poste: 'milieu_central', naissance: '2003-04-24' },
  { prenom: 'Cheick', nom: 'Coulibaly', poste: 'milieu_offensif', naissance: '1997-12-30' },
  { prenom: 'Warrick', nom: 'Folmer', poste: 'ailier_gauche', naissance: '2006-10-04' },
  { prenom: 'Daniel', nom: 'Simporé', poste: 'attaquant', naissance: '2000-08-18' },
  { prenom: 'Mohamed', nom: 'Camara', poste: 'attaquant', naissance: '2001-05-05' },
  { prenom: 'Quentin', nom: 'Valadie', poste: 'attaquant', naissance: '1998-03-17' },
  { prenom: 'Yoro', nom: 'Blonde', poste: 'attaquant', naissance: '2002-05-14' },
  { prenom: 'Exaucé', nom: 'Mbulu Mbulu', poste: 'attaquant', naissance: '2002-12-03' },
  { prenom: 'Yonni', nom: 'Levy', poste: 'attaquant', naissance: '2005-02-18' },
  { prenom: 'Souleymane', nom: 'Cissé', poste: 'attaquant', naissance: '1995-10-05' },
  { prenom: 'William', nom: 'Le Quellec Domeque', poste: 'attaquant', naissance: '2007-12-04' },
  { prenom: 'Mouhamad', nom: 'Barry', poste: 'attaquant', naissance: '2005-02-19' },
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
