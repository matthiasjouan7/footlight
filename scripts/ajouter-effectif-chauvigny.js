// Ajoute les joueurs manquants de l'effectif US Chauvigny (National 2,
// saison 2026-2027) fourni par l'utilisateur (capture d'écran type
// transfermarkt). Reproduit le chemin "ajout manuel/scouté" de
// footlight-recherche.html (email synthétique @scoute.footlight.fr, profil
// non public, badge déclaratif) — pas de compte auth créé.
//
// club = "US Chauvigny" (direct) : calendrier_officiel stocke "Chauvigny Us
// 1" (vérifié via diagnostic-club-chauvigny.js), soit les mots {chauvigny}
// une fois le mot générique "us" et le numéro final retirés — identique aux
// mots de "US Chauvigny" une fois "us" retiré, donc rapprochement correct
// via clubWordsMatch (generer-calendriers-existants.js).
//
// Anti-doublon : lecture PAGINÉE de la table joueurs (>2700 lignes, au-delà
// de la limite par défaut de 1000 lignes de PostgREST) pour ne manquer
// aucun joueur existant — corrige le bug qui a causé des doublons lors des
// ajouts précédents (AS La Châtaigneraie, US Alençon 61).
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const CLUB = 'US Chauvigny';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF US CHAUVIGNY", 26/27).
const EFFECTIF = [
  { prenom: 'Lucas', nom: 'Vovard', poste: 'gardien', naissance: '2005-12-28' },
  { prenom: 'Lucas', nom: 'Blondel', poste: 'gardien', naissance: '2005-11-15' },
  { prenom: 'Corentin', nom: 'Chaminade', poste: 'defenseur_central', naissance: '1999-07-03' },
  { prenom: 'Ben', nom: 'Soilihi Aboubacar', poste: 'defenseur_central', naissance: '1997-03-29' },
  { prenom: 'Nguedy', nom: 'Thiam', poste: 'defenseur_central', naissance: '2005-01-28' },
  { prenom: 'Ali', nom: 'Mselam', poste: 'lateral_droit', naissance: '2005-03-12' },
  { prenom: 'Pierre', nom: 'Plat', poste: 'lateral_droit', naissance: '2001-01-30' },
  { prenom: 'Célian', nom: 'Chassain', poste: 'milieu_central', naissance: '2007-03-03' },
  { prenom: 'Killyan', nom: 'Barritault', poste: 'milieu_defensif', naissance: '1993-10-19' },
  { prenom: 'Léo', nom: 'Matignon', poste: 'milieu_defensif', naissance: '1996-12-02' },
  { prenom: 'Sega', nom: 'Keita', poste: 'milieu_central', naissance: '2005-03-11' },
  { prenom: 'Louis', nom: 'Rochet', poste: 'milieu_central', naissance: '2007-09-13' },
  { prenom: 'Valentin', nom: 'Grégoire', poste: 'ailier_gauche', naissance: '2001-06-20' },
  { prenom: 'Amine', nom: 'Ramdane', poste: 'milieu_offensif', naissance: '2000-01-03' },
  { prenom: 'Amadou', nom: 'Camara', poste: 'ailier_gauche', naissance: '2005-05-12' },
  { prenom: 'Paco', nom: 'Mathis', poste: 'ailier_gauche', naissance: '2005-09-04' },
  { prenom: 'César', nom: 'Zeoula', poste: 'ailier_droit', naissance: '1989-08-29' },
  { prenom: 'Clément', nom: 'Grégoire', poste: 'attaquant', naissance: '1998-09-12' },
  { prenom: 'Hugo', nom: 'Kingue', poste: 'attaquant', naissance: '2000-10-04' },
  { prenom: 'Romain', nom: 'Essogo', poste: 'attaquant', naissance: '1998-02-14' },
];

function normaliser(str) {
  return (str || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
function slugifier(str) {
  return normaliser(str).replace(/[^a-z0-9]+/g, '');
}

const joueurs = [];
for (let offset = 0; ; offset += 1000) {
  const { data, error } = await supabase
    .from('joueurs').select('id, prenom, nom, club').range(offset, offset + 999);
  if (error) { console.error('Erreur lecture joueurs :', error.message); process.exit(1); }
  joueurs.push(...(data || []));
  if (!data || data.length < 1000) break;
}
console.log(`${joueurs.length} joueur(s) en base.\n`);

let aInserer = 0, ignores = 0;
for (const j of EFFECTIF) {
  const existant = joueurs.find(
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
