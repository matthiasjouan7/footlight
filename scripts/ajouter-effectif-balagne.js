// Ajoute les joueurs manquants de l'effectif FC Balagne (National 2,
// saison 2026-2027) fourni par l'utilisateur (capture d'écran type
// transfermarkt). Reproduit le chemin "ajout manuel/scouté" de
// footlight-recherche.html (email synthétique @scoute.footlight.fr, profil
// non public, badge déclaratif) — pas de compte auth créé.
//
// club = "F.C.Balagne 1" (orthographe exacte de calendrier_officiel,
// division N2, confirmée via diagnostic-club-balagne.js — l'un des clubs
// du groupe D sans effectif enregistré, identifié via
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

const CLUB = 'F.C.Balagne 1';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF FC BALAGNE", 26/27).
const EFFECTIF = [
  { prenom: 'Paul-André', nom: 'Guerin', poste: 'gardien', naissance: '1997-09-26' },
  { prenom: 'Jérémy', nom: 'De Bessa', poste: 'lateral_gauche', naissance: '2006-04-21' },
  { prenom: 'Julien', nom: 'Chevalier', poste: 'lateral_gauche', naissance: '1991-06-06' },
  { prenom: 'Rémy', nom: 'Duterte', poste: 'lateral_gauche', naissance: '1994-08-19' },
  { prenom: 'Yassine', nom: 'Mohamed', poste: 'lateral_gauche', naissance: '2006-01-09' },
  { prenom: 'Simon', nom: 'Ramet', poste: 'lateral_droit', naissance: '2003-03-13' },
  { prenom: 'Soufian', nom: 'Akanni', poste: 'lateral_droit', naissance: '1997-11-05' },
  { prenom: 'Hugo', nom: 'Demory', poste: 'milieu_defensif', naissance: '1995-08-04' },
  { prenom: 'Erwan', nom: 'Le Sech', poste: 'milieu_defensif', naissance: '2003-01-12' },
  { prenom: 'Chamsdine', nom: 'Fadil', poste: 'milieu_defensif', naissance: '2004-07-23' },
  { prenom: 'Bastien', nom: 'Brunet', poste: 'milieu_defensif', naissance: '1997-11-22' },
  { prenom: 'Sekhene', nom: 'Siby', poste: 'milieu_defensif', naissance: '1997-10-07' },
  { prenom: 'Yaniss', nom: 'Imamali', poste: 'milieu_defensif', naissance: '2002-11-07' },
  { prenom: 'Valère', nom: 'Pollet', poste: 'milieu_central', naissance: '1997-06-27' },
  { prenom: 'Arthur', nom: 'Vallon', poste: 'milieu_central', naissance: '1998-12-02' },
  { prenom: 'Mohamed', nom: 'Ben Allel', poste: 'milieu_offensif', naissance: '2000-04-14' },
  { prenom: 'Gauthier', nom: 'Raoul', poste: 'ailier_droit', naissance: '2000-09-23' },
  { prenom: 'Antoine', nom: 'Coquant', poste: 'attaquant', naissance: '2001-12-03' },
  { prenom: 'Mohamed', nom: 'Fernández', poste: 'attaquant', naissance: '2002-11-15' },
  { prenom: 'Hamidou', nom: 'Diallo', poste: 'attaquant', naissance: '2004-03-14' },
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
