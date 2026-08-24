// Ajoute les joueurs manquants de l'effectif Le Mans FC B (National 2,
// saison 2026-2027) fourni par l'utilisateur (capture d'écran type
// transfermarkt). Reproduit le chemin "ajout manuel/scouté" de
// footlight-recherche.html (email synthétique @scoute.footlight.fr, profil
// non public, badge déclaratif) — pas de compte auth créé.
//
// club = "Le Mans FC B" : calendrier_officiel utilise "Le Mans Fc 2"
// (vérifié via diagnostic-club-mans-b.js), mais le mot "mans" seul suffit
// au rapprochement via clubWordsMatch (generer-calendriers-existants.js),
// donc pas besoin d'un nom spécial comme pour Cestas/Castanet/Chinon.
//
// "Milieu droit" (absent de l'enum poste de l'app) mappé sur ailier_droit,
// comme pour Blagnac FC / FC Chamalières. "Avant-centre" sur attaquant,
// comme pour les effectifs précédents.
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

const CLUB = 'Le Mans FC B';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF LE MANS FC B", 26/27).
const EFFECTIF = [
  { prenom: 'Alec', nom: 'Roullier', poste: 'gardien', naissance: '2007-07-02' },
  { prenom: 'Tyron', nom: 'Macomba', poste: 'gardien', naissance: '2008-04-02' },
  { prenom: 'Enzo', nom: 'Kost', poste: 'defenseur_central', naissance: '2006-06-24' },
  { prenom: 'Leny', nom: 'Cormier', poste: 'defenseur_central', naissance: '2007-01-20' },
  { prenom: 'Younes', nom: 'Kloufi', poste: 'defenseur_central', naissance: '2007-09-29' },
  { prenom: 'Gatien', nom: 'Huet', poste: 'defenseur_central', naissance: '2007-07-05' },
  { prenom: 'Swann', nom: 'Chaigneau', poste: 'defenseur_central', naissance: '2008-12-06' },
  { prenom: 'Mathis', nom: 'Gaudin', poste: 'lateral_gauche', naissance: '2007-02-14' },
  { prenom: 'Ymraan', nom: 'Madi', poste: 'lateral_droit', naissance: '2007-02-05' },
  { prenom: 'Lenny', nom: 'Videira', poste: 'milieu_defensif', naissance: '2006-07-05' },
  { prenom: 'Yanis', nom: 'Daoud', poste: 'milieu_defensif', naissance: '2007-01-27' },
  { prenom: 'Arthur', nom: 'Chevereau', poste: 'milieu_central', naissance: '2008-09-09' },
  { prenom: 'Zohir', nom: 'Oissa', poste: 'ailier_droit', naissance: '2008-02-19' },
  { prenom: 'Sacha', nom: 'Barakat', poste: 'milieu_offensif', naissance: '2006-10-19' },
  { prenom: 'Niyad', nom: 'Adamé', poste: 'milieu_offensif', naissance: '2008-11-13' },
  { prenom: 'Oussama', nom: 'Lyakoubi', poste: 'ailier_gauche', naissance: '2005-04-23' },
  { prenom: 'Lucas', nom: 'Botherel', poste: 'ailier_gauche', naissance: '2007-03-11' },
  { prenom: 'Adnane', nom: 'Kharroubi', poste: 'ailier_droit', naissance: '2006-08-03' },
  { prenom: 'Tayson', nom: 'Franquet', poste: 'ailier_droit', naissance: '2007-08-20' },
  { prenom: 'Benny', nom: 'Eguge', poste: 'attaquant', naissance: '2006-11-03' },
  { prenom: 'Noah', nom: 'Delem', poste: 'attaquant', naissance: '2009-02-05' },
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
