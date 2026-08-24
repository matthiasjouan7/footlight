// Ajoute les joueurs manquants de l'effectif Pau FC B (National 2 groupe
// A, saison 2026-2027) fourni par l'utilisateur (capture d'écran type
// transfermarkt). Reproduit le chemin "ajout manuel/scouté" de
// footlight-recherche.html (email synthétique @scoute.footlight.fr,
// profil non public, badge déclaratif) — pas de compte auth créé.
//
// club = "Pau FC 2" (même convention que les autres équipes réserves déjà
// ajoutées — Rodez AF 2, etc. — pour garantir le rapprochement club dans
// generer-calendriers-existants.js, calendrier_officiel utilisant "Pau Fc
// 2").
//
// "Avant-centre" mappé sur attaquant. Maxim Pigal n'a pas de date de
// naissance affichée sur la capture ("(-)"), laissée à null.
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

const CLUB = 'Pau FC 2';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF PAU FC B", 26/27).
const EFFECTIF = [
  { prenom: 'Matis', nom: 'Duval', poste: 'gardien', naissance: '2007-07-17' },
  { prenom: 'Georges', nom: 'Grimaud', poste: 'gardien', naissance: '2006-08-26' },
  { prenom: 'Tao', nom: 'Belabdi', poste: 'gardien', naissance: '2007-07-12' },
  { prenom: 'Louis', nom: 'Forestier', poste: 'gardien', naissance: '2008-02-02' },
  { prenom: 'Aly', nom: 'Naïte', poste: 'defenseur_central', naissance: '2000-03-02' },
  { prenom: 'Paris', nom: 'Irie', poste: 'defenseur_central', naissance: '2006-04-10' },
  { prenom: 'Adam', nom: 'El Mahjouby', poste: 'defenseur_central', naissance: '2006-01-20' },
  { prenom: 'Lucas', nom: 'Rakotozafy', poste: 'defenseur_central', naissance: '2007-03-15' },
  { prenom: "Wa'il", nom: 'Jaafar', poste: 'defenseur_central', naissance: '2007-06-05' },
  { prenom: 'Clément', nom: 'Ellama', poste: 'defenseur_central', naissance: '2009-07-20' },
  { prenom: 'Noam', nom: 'Maluzo Lawol', poste: 'lateral_gauche', naissance: '2006-07-14' },
  { prenom: 'Enzo', nom: 'Derouin', poste: 'lateral_gauche', naissance: '2007-10-22' },
  { prenom: 'Valentin', nom: 'Liénard', poste: 'lateral_droit', naissance: '1998-01-11' },
  { prenom: 'Alexandre', nom: 'Estrade', poste: 'lateral_droit', naissance: '2007-09-15' },
  { prenom: 'Clément', nom: 'Pujos', poste: 'milieu_defensif', naissance: '2005-11-25' },
  { prenom: 'Louan', nom: 'Miquel', poste: 'milieu_defensif', naissance: '2008-08-03' },
  { prenom: 'Tidjan', nom: 'Diaby', poste: 'milieu_central', naissance: '2004-03-22' },
  { prenom: 'Hamada', nom: 'Yaisien', poste: 'milieu_central', naissance: '2009-10-09' },
  { prenom: 'Patxi', nom: 'Idiart', poste: 'milieu_offensif', naissance: '2007-04-25' },
  { prenom: 'Vincent', nom: 'Cassourret', poste: 'milieu_offensif', naissance: '2008-11-18' },
  { prenom: 'Thibaut', nom: 'Batbedat', poste: 'milieu_offensif', naissance: '2008-08-01' },
  { prenom: 'Brandon', nom: 'Nativoha', poste: 'ailier_droit', naissance: '2008-04-04' },
  { prenom: 'Marius', nom: 'Savidan', poste: 'attaquant', naissance: '2007-05-16' },
  { prenom: 'Maxim', nom: 'Pigal', poste: 'attaquant', naissance: null },
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
  console.log(`${j.prenom} ${j.nom} : à créer (${j.poste}, ${CLUB}, né(e) ${j.naissance || '?'}).`);
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
