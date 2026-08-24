// Ajoute les joueurs manquants de l'effectif AS Steenvoorde (National 2,
// saison 2026-2027) fourni par l'utilisateur (capture d'écran type
// transfermarkt). Reproduit le chemin "ajout manuel/scouté" de
// footlight-recherche.html (email synthétique @scoute.footlight.fr, profil
// non public, badge déclaratif) — pas de compte auth créé.
//
// club = "Steenvoorde As 1" (orthographe exacte de calendrier_officiel,
// division N2, confirmée via diagnostic-club-steenvoorde.js — l'un des
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

const CLUB = 'Steenvoorde As 1';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF AS STEENVOORDE", 26/27).
const EFFECTIF = [
  { prenom: 'Paulo', nom: 'Pinho', poste: 'gardien', naissance: '1997-02-11' },
  { prenom: 'Martin', nom: "D'Henry", poste: 'gardien', naissance: null },
  { prenom: 'Samuel', nom: 'Reschid', poste: 'gardien', naissance: '1995-04-09' },
  { prenom: 'Mathys', nom: 'Eog', poste: 'defenseur_central', naissance: '2004-09-12' },
  { prenom: 'Elliot', nom: 'Delay', poste: 'defenseur_central', naissance: '2008-05-12' },
  { prenom: 'Lilian', nom: 'Thooris', poste: 'defenseur_central', naissance: '2005-01-09' },
  { prenom: 'Raphaël', nom: 'Depriester', poste: 'defenseur_central', naissance: '1993-05-22' },
  { prenom: 'Bryan', nom: 'Pierre', poste: 'defenseur_central', naissance: '2004-07-05' },
  { prenom: 'Abdelkader', nom: 'Gouriny', poste: 'lateral_gauche', naissance: '2001-12-27' },
  { prenom: 'Chris', nom: 'Pernisek', poste: 'lateral_gauche', naissance: '2001-10-26' },
  { prenom: 'Antoine', nom: 'Schapman', poste: 'lateral_gauche', naissance: '1996-02-21' },
  { prenom: 'Arthur', nom: 'Bouve', poste: 'lateral_droit', naissance: '1996-04-12' },
  { prenom: 'Jérémy', nom: 'Decool', poste: 'lateral_droit', naissance: '1990-11-27' },
  { prenom: 'Lucas', nom: 'Logghe', poste: 'milieu_defensif', naissance: '2000-11-10' },
  { prenom: 'Nicolas', nom: 'Bertheloot', poste: 'milieu_defensif', naissance: '1991-07-04' },
  { prenom: 'Maxence', nom: 'Terrier', poste: 'milieu_defensif', naissance: '1989-09-19' },
  { prenom: 'Thibaut', nom: 'Buniet', poste: 'milieu_defensif', naissance: '2004-06-11' },
  { prenom: 'Théo', nom: 'Plancke', poste: 'milieu_central', naissance: '2003-11-12' },
  { prenom: 'Nolan', nom: 'Wieczorek', poste: 'milieu_central', naissance: '2006-07-20' },
  { prenom: 'Victor', nom: 'Thélot', poste: 'milieu_offensif', naissance: '1995-10-30' },
  { prenom: 'Adrien', nom: 'Desruelle', poste: 'ailier_gauche', naissance: '1994-01-06' },
  { prenom: 'Yanis', nom: 'Gruwez', poste: 'ailier_droit', naissance: '2004-10-04' },
  { prenom: 'Sofiane', nom: 'Hadiri', poste: 'ailier_droit', naissance: '2004-07-01' },
  { prenom: 'Bilal', nom: 'Gharbi', poste: 'attaquant', naissance: '1995-04-15' },
  { prenom: 'Timothy', nom: 'Lezier', poste: 'attaquant', naissance: '2004-12-29' },
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
