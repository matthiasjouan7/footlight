// Ajoute les joueurs manquants de l'effectif Olympique Charleville Prix
// Ardenne Mét. (National 2, saison 2026-2027) fourni par l'utilisateur
// (capture d'écran type transfermarkt). Reproduit le chemin "ajout
// manuel/scouté" de footlight-recherche.html (email synthétique
// @scoute.footlight.fr, profil non public, badge déclaratif) — pas de
// compte auth créé.
//
// "Milieu droit" et "Milieu gauche" (sans mapping dédié) traités comme
// génériques et mappés sur milieu_central. "Avant-centre" mappé sur
// attaquant.
//
// club = "Charleville Prix Oam 1" (orthographe exacte de
// calendrier_officiel, division N2, confirmée via
// diagnostic-club-charleville.js — l'un des clubs du groupe E sans
// effectif enregistré).
//
// Anti-doublon : lecture PAGINÉE de la table joueurs (>2900 lignes, au-delà
// de la limite par défaut de 1000 lignes de PostgREST) pour ne manquer
// aucun joueur existant. Plusieurs joueurs de la capture portent une icône
// de prêt (Xavier Hoareau, Miracle Ikharo, Jordan Konango Mbon, Ben Ali,
// Yohann Vetro, Karim Koriche, Celyan Djattit, Pablo Hernandez, Sheldon
// Mandangui, Kelian Semedo, Walid Salhi) — s'ils sont détectés en base sous
// un autre club, ne PAS modifier leur club sans confirmation explicite de
// l'utilisateur.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const CLUB = 'Charleville Prix Oam 1';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF OLYMPIQUE CHARLEVILLE
// PRIX ARDENNE MÉT.", 26/27).
const EFFECTIF = [
  { prenom: 'Ludovic', nom: 'Butelle', poste: 'gardien', naissance: '1983-04-03' },
  { prenom: 'Xavier', nom: 'Hoareau', poste: 'gardien', naissance: '1999-05-22' },
  { prenom: 'Adrien', nom: 'Kack', poste: 'defenseur_central', naissance: '2002-02-11' },
  { prenom: 'Mamadou', nom: 'Sacko', poste: 'defenseur_central', naissance: '1996-07-21' },
  { prenom: 'Somala', nom: 'Kamara', poste: 'defenseur_central', naissance: '2000-09-22' },
  { prenom: 'Miracle', nom: 'Ikharo', poste: 'defenseur_central', naissance: '2004-05-24' },
  { prenom: 'Romain', nom: 'Ekani', poste: 'lateral_gauche', naissance: '2004-03-31' },
  { prenom: 'Larbi', nom: 'Arbaoui', poste: 'lateral_droit', naissance: '1998-10-05' },
  { prenom: 'Jordan', nom: 'Konango Mbon', poste: 'lateral_droit', naissance: '2002-05-03' },
  { prenom: 'Mamady', nom: 'Bamba', poste: 'milieu_defensif', naissance: '1999-08-07' },
  { prenom: 'Nathan', nom: 'Jeannot', poste: 'milieu_defensif', naissance: '2005-11-15' },
  { prenom: 'Ben', nom: 'Ali', poste: 'milieu_defensif', naissance: '2001-06-04' },
  { prenom: 'Calvin', nom: 'Bombo', poste: 'milieu_central', naissance: '1999-01-18' },
  { prenom: 'Yohann', nom: 'Vetro', poste: 'milieu_central', naissance: '2000-12-07' },
  { prenom: 'Sofiane', nom: 'Rouane', poste: 'milieu_central', naissance: '1997-02-14' },
  { prenom: 'Karim', nom: 'Koriche', poste: 'milieu_offensif', naissance: '1994-01-11' },
  { prenom: 'Celyan', nom: 'Djattit', poste: 'milieu_offensif', naissance: '2003-01-05' },
  { prenom: 'Hamza', nom: 'El Goundoul', poste: 'milieu_offensif', naissance: '1999-08-12' },
  { prenom: 'Pablo', nom: 'Hernandez', poste: 'milieu_offensif', naissance: '2006-02-08' },
  { prenom: 'Sheldon', nom: 'Mandangui', poste: 'ailier_gauche', naissance: '2002-12-15' },
  { prenom: 'Kelian', nom: 'Semedo', poste: 'ailier_droit', naissance: '2006-04-04' },
  { prenom: 'Scott', nom: 'Kyei', poste: 'attaquant', naissance: '1999-07-22' },
  { prenom: 'Nolan', nom: 'Jeanne', poste: 'attaquant', naissance: '2005-05-06' },
  { prenom: 'Walid', nom: 'Salhi', poste: 'attaquant', naissance: '2002-05-07' },
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
  console.log(`${j.prenom} ${j.nom} : à créer (${j.poste}, ${CLUB}, né(e) ${j.naissance || '—'}).`);
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
