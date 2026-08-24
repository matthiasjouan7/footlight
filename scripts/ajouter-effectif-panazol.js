// Ajoute les joueurs manquants de l'effectif AS Panazol (National 2,
// saison 2026-2027) fourni par l'utilisateur (capture d'écran type
// transfermarkt). Reproduit le chemin "ajout manuel/scouté" de
// footlight-recherche.html (email synthétique @scoute.footlight.fr, profil
// non public, badge déclaratif) — pas de compte auth créé.
//
// club = "AS Panazol" : calendrier_officiel utilise "Panazol As 1" (vérifié
// via diagnostic-club-panazol.js), mais le mot "panazol" seul suffit au
// rapprochement via clubWordsMatch (generer-calendriers-existants.js),
// donc pas besoin d'un nom spécial comme pour Cestas/Castanet.
//
// "Défense" (générique) mappé sur defenseur_central, "Milieu" (générique)
// sur milieu_central, "Avant-centre" sur attaquant, comme pour les
// effectifs précédents.
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

const CLUB = 'AS Panazol';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF AS PANAZOL", 26/27).
const EFFECTIF = [
  { prenom: 'Artur', nom: 'Toroyan', poste: 'gardien', naissance: '1992-02-01' },
  { prenom: 'Charly', nom: 'Dosso', poste: 'gardien', naissance: '2003-04-09' },
  { prenom: 'Ionuț', nom: 'Ana', poste: 'gardien', naissance: '2005-09-12' },
  { prenom: 'Enok', nom: 'Tabala', poste: 'gardien', naissance: '2003-10-03' },
  { prenom: 'Ilyes', nom: 'Qerrouani', poste: 'defenseur_central', naissance: '2007-09-05' },
  { prenom: 'Steve', nom: 'Njiki Djitchou', poste: 'defenseur_central', naissance: '2002-06-17' },
  { prenom: 'Abdoulaye', nom: 'Sow', poste: 'defenseur_central', naissance: '2005-04-03' },
  { prenom: 'Mohamed', nom: 'Tougouman', poste: 'defenseur_central', naissance: '2001-06-10' },
  { prenom: 'Yanis', nom: 'Beude', poste: 'defenseur_central', naissance: '2001-05-07' },
  { prenom: 'Sounkar', nom: 'Tamba', poste: 'defenseur_central', naissance: '1997-11-11' },
  { prenom: 'Kassim', nom: 'Ballo', poste: 'defenseur_central', naissance: '2001-03-27' },
  { prenom: 'Jean-David', nom: 'Gomis', poste: 'lateral_gauche', naissance: '2006-08-30' },
  { prenom: 'Marouane', nom: 'Majdoubi', poste: 'lateral_gauche', naissance: '2007-10-16' },
  { prenom: 'Chérif', nom: 'Sané', poste: 'lateral_gauche', naissance: '2005-06-30' },
  { prenom: 'Hamza', nom: 'El Koubaiti', poste: 'lateral_droit', naissance: '2000-12-19' },
  { prenom: 'El Hadji Salif', nom: 'Ngom', poste: 'milieu_defensif', naissance: '2003-11-22' },
  { prenom: 'Alex', nom: 'Lorigny', poste: 'milieu_central', naissance: '2003-02-15' },
  { prenom: 'Mbengue', nom: 'Cissé', poste: 'milieu_defensif', naissance: '2002-03-17' },
  { prenom: 'Emmanuel', nom: 'Zito', poste: 'milieu_central', naissance: '2006-01-02' },
  { prenom: 'Jodinel', nom: 'Nzeza', poste: 'milieu_central', naissance: '1996-04-24' },
  { prenom: 'Ibrahima', nom: 'Touré', poste: 'milieu_central', naissance: '2002-06-15' },
  { prenom: 'Samuel', nom: 'Morin', poste: 'milieu_central', naissance: '2007-03-01' },
  { prenom: 'Hakim', nom: 'Bouchareb', poste: 'milieu_offensif', naissance: '1997-03-11' },
  { prenom: 'Lenny', nom: 'De Lassus Guillerm', poste: 'milieu_offensif', naissance: '2007-02-14' },
  { prenom: 'Alidjah', nom: 'Aït Fana', poste: 'milieu_offensif', naissance: '2006-06-06' },
  { prenom: 'Karim', nom: 'Benyazid', poste: 'milieu_offensif', naissance: '2004-08-28' },
  { prenom: 'Abdoulaye', nom: 'Bathily', poste: 'ailier_gauche', naissance: '2002-08-07' },
  { prenom: 'Bryan', nom: 'Bofunda', poste: 'ailier_gauche', naissance: '1996-11-29' },
  { prenom: 'Wassim', nom: 'El Hamouli', poste: 'ailier_gauche', naissance: '2003-04-18' },
  { prenom: 'Mouhamed', nom: 'Pouye', poste: 'ailier_droit', naissance: '1997-12-26' },
  { prenom: 'Hugues-Kévin', nom: 'Sakoa', poste: 'attaquant', naissance: '2003-09-19' },
  { prenom: 'Khadim', nom: 'Dieng', poste: 'attaquant', naissance: '2003-12-11' },
  { prenom: 'Ange', nom: 'Gobe', poste: 'attaquant', naissance: '2006-02-02' },
  { prenom: 'Yamadou', nom: 'Cissokho', poste: 'attaquant', naissance: '2002-09-30' },
  { prenom: 'Boubacar', nom: 'Sissoko', poste: 'attaquant', naissance: '2005-02-10' },
  { prenom: 'Wahib', nom: 'Souames', poste: 'attaquant', naissance: '2007-06-22' },
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
