// Ajoute les joueurs manquants de l'effectif FC Nantes B (National 2
// groupe B, saison 2026-2027) fourni par l'utilisateur (capture d'écran
// type transfermarkt). Reproduit le chemin "ajout manuel/scouté" de
// footlight-recherche.html (email synthétique @scoute.footlight.fr, profil
// non public, badge déclaratif) — pas de compte auth créé.
//
// club = "FC Nantes B" : calendrier_officiel utilise "Fc Nantes 2" (vérifié
// via diagnostic-club-nantes-b.js), mais le mot "nantes" seul suffit au
// rapprochement via clubWordsMatch (generer-calendriers-existants.js),
// donc pas besoin d'un nom spécial comme pour Rodez/Pau/Anglet/Cestas.
//
// "Arrière gauche"/"Arrière droit" mappés sur lateral_gauche/lateral_droit,
// "Avant-centre" sur attaquant, comme pour les effectifs précédents.
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

const CLUB = 'FC Nantes B';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF FC NANTES B", 26/27).
const EFFECTIF = [
  { prenom: 'Lucas', nom: 'Bonelli', poste: 'gardien', naissance: '2003-02-14' },
  { prenom: 'Daniel', nom: 'Le Duigou', poste: 'gardien', naissance: '2007-05-18' },
  { prenom: 'Yanel', nom: 'Zézé', poste: 'gardien', naissance: '2008-03-18' },
  { prenom: 'Enzo', nom: 'Mongo', poste: 'defenseur_central', naissance: '2005-04-08' },
  { prenom: 'Taïgy', nom: 'Dugard', poste: 'defenseur_central', naissance: '2006-12-02' },
  { prenom: 'Musunda', nom: 'Mwamba', poste: 'defenseur_central', naissance: '2006-07-28' },
  { prenom: 'Babacar', nom: 'Fall', poste: 'defenseur_central', naissance: '2007-05-08' },
  { prenom: 'Romaric', nom: 'Lokpo', poste: 'defenseur_central', naissance: '2007-01-01' },
  { prenom: 'Tom', nom: 'Raiani', poste: 'lateral_gauche', naissance: '2008-04-15' },
  { prenom: 'Moutanabi', nom: 'Bodiang', poste: 'lateral_droit', naissance: '2003-03-14' },
  { prenom: 'Hugo', nom: 'Lamy', poste: 'lateral_droit', naissance: '2004-01-16' },
  { prenom: 'Yoann', nom: 'Chauvin', poste: 'lateral_droit', naissance: '2007-02-22' },
  { prenom: 'Sacha', nom: 'Ziani', poste: 'milieu_defensif', naissance: '2003-08-07' },
  { prenom: 'Timothé', nom: 'David', poste: 'milieu_defensif', naissance: '2004-06-24' },
  { prenom: 'Sanah', nom: 'Camara', poste: 'milieu_defensif', naissance: '2008-04-08' },
  { prenom: 'Christian', nom: 'Djonda', poste: 'milieu_defensif', naissance: '2007-03-01' },
  { prenom: 'Emmanuel', nom: 'Kiah', poste: 'milieu_defensif', naissance: '2006-02-27' },
  { prenom: 'Moustapha', nom: 'Dabo', poste: 'ailier_droit', naissance: '2007-08-20' },
  { prenom: 'Klaus', nom: 'Camara', poste: 'ailier_droit', naissance: '2007-11-03' },
  { prenom: 'Junior', nom: 'Koné', poste: 'attaquant', naissance: '2007-03-11' },
  { prenom: 'Maxime', nom: 'Mejjati-Alami', poste: 'attaquant', naissance: '2004-09-08' },
  { prenom: 'Hamissou', nom: 'Dangabo', poste: 'attaquant', naissance: '2003-01-15' },
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
