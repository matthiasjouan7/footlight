// Ajoute les joueurs manquants de l'effectif Saint-Amand FC (National 2,
// saison 2026-2027) fourni par l'utilisateur (capture d'écran type
// transfermarkt). Reproduit le chemin "ajout manuel/scouté" de
// footlight-recherche.html (email synthétique @scoute.footlight.fr, profil
// non public, badge déclaratif) — pas de compte auth créé.
//
// club = "St Amand Fc 1" (orthographe exacte de calendrier_officiel,
// division N2, confirmée via diagnostic-club-saint-amand.js — l'un des
// clubs du groupe D sans effectif enregistré, identifié via
// diagnostic-effectifs-manquants-n2.js).
//
// Anti-doublon : lecture PAGINÉE de la table joueurs (>2900 lignes, au-delà
// de la limite par défaut de 1000 lignes de PostgREST) pour ne manquer
// aucun joueur existant.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const CLUB = 'St Amand Fc 1';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF SAINT-AMAND FC", 26/27).
const EFFECTIF = [
  { prenom: 'Corentin', nom: 'Laurent', poste: 'gardien', naissance: '2001-04-23' },
  { prenom: 'Léonin', nom: 'Autem', poste: 'gardien', naissance: null },
  { prenom: 'Dylan', nom: 'Lamonnier', poste: 'defenseur_central', naissance: '1994-03-15' },
  { prenom: 'Antoine', nom: 'Danna', poste: 'defenseur_central', naissance: '2002-03-03' },
  { prenom: 'Saliou', nom: 'Ciss', poste: 'lateral_gauche', naissance: '1989-09-15' },
  { prenom: 'Anthony', nom: 'Goelzer', poste: 'lateral_gauche', naissance: '1998-09-12' },
  { prenom: 'Alexis', nom: 'Fernandes', poste: 'lateral_gauche', naissance: '2008-03-23' },
  { prenom: 'Joffrey', nom: 'Cuffaut', poste: 'lateral_droit', naissance: '1988-03-15' },
  { prenom: 'Corentin', nom: 'Bajard', poste: 'lateral_droit', naissance: '1994-07-25' },
  { prenom: 'Alexandre', nom: 'Moliner', poste: 'lateral_droit', naissance: '2003-01-14' },
  { prenom: 'Jules', nom: 'Collet', poste: 'milieu_defensif', naissance: '2005-06-21' },
  { prenom: 'Guillaume', nom: 'Doré', poste: 'milieu_defensif', naissance: '1997-06-03' },
  { prenom: 'Edwin', nom: 'Tchoko', poste: 'milieu_central', naissance: '2004-07-30' },
  { prenom: 'Amine', nom: 'Aït Bahamed', poste: 'milieu_central', naissance: '1999-05-09' },
  { prenom: 'Nassim', nom: 'Oukoukes', poste: 'milieu_central', naissance: '2007-04-01' },
  { prenom: 'Adam', nom: 'Abeddou', poste: 'milieu_offensif', naissance: '1996-08-17' },
  { prenom: 'Quentin', nom: 'Garcia Dominguez', poste: 'milieu_offensif', naissance: '1995-07-08' },
  { prenom: 'Billali', nom: 'Cissé', poste: 'milieu_offensif', naissance: '2001-01-20' },
  { prenom: 'Anthony', nom: 'Jacquin', poste: 'milieu_offensif', naissance: '1995-08-02' },
  { prenom: 'El Mehdi', nom: 'El Kinani', poste: 'ailier_droit', naissance: '1996-02-27' },
  { prenom: 'Benoît', nom: 'Dureux', poste: 'ailier_droit', naissance: '2005-06-10' },
  { prenom: 'Baptiste', nom: 'Nouchet', poste: 'attaquant', naissance: '2001-11-15' },
  { prenom: 'Gaëtan', nom: 'Ducatillon', poste: 'attaquant', naissance: '2001-08-10' },
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
