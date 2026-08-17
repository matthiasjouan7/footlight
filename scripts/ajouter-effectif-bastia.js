// Ajoute les joueurs manquants de l'effectif SC Bastia (Ligue 3, saison
// 2026-2027) fourni par l'utilisateur (capture d'écran type transfermarkt).
// Reproduit le chemin "ajout manuel/scouté" de footlight-recherche.html
// (email synthétique @scoute.footlight.fr, profil non public, badge
// déclaratif) — pas de compte auth créé.
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

const CLUB = 'SC Bastia';
const NIVEAU = 'Ligue 3';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF SC BASTIA", 26/27).
const EFFECTIF = [
  { prenom: 'Théo', nom: 'De Percin', poste: 'gardien', naissance: '2001-02-02' },
  { prenom: 'Sacha', nom: 'Contena', poste: 'gardien', naissance: '2005-10-04' },
  { prenom: 'Luca', nom: 'Pausé', poste: 'gardien', naissance: '2006-03-29' },
  { prenom: 'Anthony', nom: 'Roncaglia', poste: 'defenseur_central', naissance: '2000-08-30' },
  { prenom: 'Gustave', nom: 'Akueson', poste: 'defenseur_central', naissance: '1995-12-20' },
  { prenom: 'Noah', nom: 'Zilliox', poste: 'defenseur_central', naissance: '2003-03-17' },
  { prenom: 'David', nom: 'Djédjé', poste: 'defenseur_central', naissance: '2007-01-30' },
  { prenom: 'Dramane', nom: 'Diarra', poste: 'defenseur_central', naissance: '2006-10-19' },
  { prenom: 'Isaac', nom: 'Monnier', poste: 'lateral_gauche', naissance: '2006-09-09' },
  { prenom: 'Tom', nom: 'Meynadier', poste: 'lateral_droit', naissance: '2000-01-27' },
  { prenom: 'Cléo', nom: 'Mélières', poste: 'lateral_droit', naissance: '2005-04-13' },
  { prenom: 'Jocelyn', nom: 'Janneh', poste: 'milieu_defensif', naissance: '2002-12-06' },
  { prenom: 'Joachim', nom: 'Eickmayer', poste: 'milieu_defensif', naissance: '1993-01-11' },
  { prenom: 'Matteo', nom: 'Petrignani', poste: 'milieu_defensif', naissance: '2005-09-09' },
  { prenom: 'Lakhdar', nom: 'Belal', poste: 'milieu_central', naissance: '2000-06-19' },
  { prenom: 'Alexandre', nom: 'Zaouai', poste: 'milieu_offensif', naissance: '2005-04-01' },
  { prenom: 'Ayman', nom: 'Aiki', poste: 'ailier_droit', naissance: '2005-06-25' },
  { prenom: 'Erawan', nom: 'Garnier', poste: 'ailier_droit', naissance: '2006-01-05' },
  { prenom: 'Félix', nom: 'Tomi', poste: 'attaquant', naissance: '2000-08-31' },
  { prenom: 'Jérémy', nom: 'Sebas', poste: 'attaquant', naissance: '2003-04-14' },
  { prenom: 'Clément', nom: 'Rodrigues', poste: 'attaquant', naissance: '2000-12-04' },
  { prenom: 'Ruben', nom: 'Beliandjou', poste: 'attaquant', naissance: '2005-07-08' },
  { prenom: 'Mohamed', nom: 'Boumaaoui', poste: 'attaquant', naissance: '2004-09-22' },
  { prenom: 'Maxime', nom: 'Blé', poste: 'attaquant', naissance: '2002-07-26' },
  { prenom: 'Daouda', nom: 'Tamba', poste: 'attaquant', naissance: '2006-12-20' },
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
