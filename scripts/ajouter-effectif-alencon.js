// Ajoute les joueurs manquants de l'effectif US Alençon 61 (National 2,
// saison 2026-2027) fourni par l'utilisateur (capture d'écran type
// transfermarkt). Reproduit le chemin "ajout manuel/scouté" de
// footlight-recherche.html (email synthétique @scoute.footlight.fr, profil
// non public, badge déclaratif) — pas de compte auth créé.
//
// club = "US Alençonnaise" (pas "US Alençon 61") : calendrier_officiel
// utilise "Us Alenconnaise 61 1" (vérifié via diagnostic-club-alencon.js).
// "Alençon" (ville) et "Alençonnaise" (démonyme/adjectif) sont deux mots
// différents pour clubWordsMatch (generer-calendriers-existants.js), même
// situation que Castanet/Castanéenne — nom engineeré nécessaire. "61" est
// volontairement omis : normalizeClub ne retire qu'un seul nombre final,
// donc l'ajouter à notre nom le ferait justement disparaître de notre
// propre côté (repasserait par le même strip), sans jamais aider le
// rapprochement.
//
// "Défense" (générique) mappé sur defenseur_central par défaut, comme
// pour les effectifs précédents (Chinon, etc.).
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

const CLUB = 'US Alençonnaise';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF US ALENÇON 61", 26/27).
const EFFECTIF = [
  { prenom: 'Arthur', nom: 'Duval', poste: 'gardien', naissance: '1998-11-07' },
  { prenom: 'Aymeric', nom: 'Potiron', poste: 'gardien', naissance: '2005-04-18' },
  { prenom: 'Joshua', nom: 'Santini', poste: 'gardien', naissance: '2008-02-02' },
  { prenom: 'Karim', nom: 'El Hamdaoui', poste: 'defenseur_central', naissance: '1991-09-21' },
  { prenom: 'Nathan', nom: 'Truet', poste: 'defenseur_central', naissance: '2004-03-07' },
  { prenom: 'Samuel-Bill', nom: 'Kamga', poste: 'defenseur_central', naissance: '2000-08-13' },
  { prenom: 'Edgard', nom: 'Nganga', poste: 'defenseur_central', naissance: '1999-09-04' },
  { prenom: 'Lucas', nom: 'Guéguen', poste: 'defenseur_central', naissance: '2007-08-08' },
  { prenom: 'Joachim', nom: 'Lepage', poste: 'lateral_gauche', naissance: '1997-01-05' },
  { prenom: 'William', nom: 'Dayoro', poste: 'lateral_droit', naissance: '1998-11-17' },
  { prenom: 'Lucas', nom: 'Liger', poste: 'milieu_defensif', naissance: '2003-01-08' },
  { prenom: 'Maxence', nom: 'Agnoly', poste: 'milieu_central', naissance: '2005-03-01' },
  { prenom: 'Ullrich', nom: 'Pereira Souza', poste: 'milieu_central', naissance: '2003-07-11' },
  { prenom: 'Shelley', nom: 'Bindika Ndalla', poste: 'milieu_central', naissance: '1999-11-05' },
  { prenom: 'Steve', nom: 'Delacour', poste: 'milieu_offensif', naissance: '2001-12-01' },
  { prenom: 'Thibaud', nom: 'Legrou', poste: 'milieu_offensif', naissance: '2006-01-18' },
  { prenom: 'Lorenzo', nom: 'Guillier', poste: 'milieu_offensif', naissance: '2008-08-19' },
  { prenom: 'Hakim', nom: 'El Hamdaoui', poste: 'attaquant', naissance: '1991-09-21' },
  { prenom: 'Elyass', nom: 'Dhoifirou', poste: 'attaquant', naissance: '1997-04-12' },
  { prenom: 'Loukas', nom: 'Lopes Marques', poste: 'attaquant', naissance: '2004-11-26' },
  { prenom: 'Ayoub', nom: 'Stiouet', poste: 'attaquant', naissance: '2007-04-23' },
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
