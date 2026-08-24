// Ajoute les joueurs manquants de l'effectif Iris Club de Croix (National
// 2, saison 2026-2027) fourni par l'utilisateur (capture d'écran type
// transfermarkt). Reproduit le chemin "ajout manuel/scouté" de
// footlight-recherche.html (email synthétique @scoute.footlight.fr, profil
// non public, badge déclaratif) — pas de compte auth créé.
//
// club = "Croix Fic 1" (orthographe exacte de calendrier_officiel,
// division N2, confirmée via diagnostic-club-croix.js — l'un des clubs
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

const CLUB = 'Croix Fic 1';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF IRIS CLUB DE CROIX", 26/27).
const EFFECTIF = [
  { prenom: 'Guiliano', nom: 'Marchione', poste: 'gardien', naissance: '1989-05-17' },
  { prenom: 'Tanguy', nom: 'Vincent', poste: 'gardien', naissance: '1999-12-09' },
  { prenom: 'Hugo', nom: 'Robert', poste: 'defenseur_central', naissance: '1996-06-01' },
  { prenom: 'Anzo', nom: 'Lesage', poste: 'defenseur_central', naissance: '2001-01-09' },
  { prenom: 'Stephanas', nom: 'Kamondji', poste: 'defenseur_central', naissance: '1995-07-13' },
  { prenom: 'Maxime', nom: 'Louchart', poste: 'defenseur_central', naissance: '1993-09-07' },
  { prenom: 'Théo', nom: 'Sylla', poste: 'defenseur_central', naissance: '2003-10-08' },
  { prenom: 'Thomas', nom: 'Lefebvre', poste: 'lateral_gauche', naissance: '2002-07-04' },
  { prenom: 'Kamil', nom: 'Ouraghi', poste: 'lateral_droit', naissance: '2002-07-02' },
  { prenom: 'Valentin', nom: 'Vanbaleghem', poste: 'milieu_defensif', naissance: '1996-10-09' },
  { prenom: 'Lilian', nom: 'Lorthiois', poste: 'milieu_defensif', naissance: '1991-06-20' },
  { prenom: 'Moustapha', nom: 'Fall', poste: 'milieu_central', naissance: '2003-05-05' },
  { prenom: 'Thomas', nom: 'Coppin', poste: 'milieu_central', naissance: '1998-01-29' },
  { prenom: 'Adam', nom: 'Iquioussen', poste: 'milieu_central', naissance: '2006-03-13' },
  { prenom: 'Sékou', nom: 'Camara', poste: 'milieu_central', naissance: '2006-05-24' },
  { prenom: 'Brian', nom: 'Obino', poste: 'milieu_offensif', naissance: '1988-01-30' },
  { prenom: 'Fares', nom: 'Hassani', poste: 'milieu_offensif', naissance: '1991-09-02' },
  { prenom: 'Sofiane', nom: 'Mihoubi', poste: 'milieu_offensif', naissance: '1998-11-10' },
  { prenom: 'Ahmed', nom: 'Bouzar', poste: 'milieu_offensif', naissance: '1998-05-05' },
  { prenom: 'Mohamed', nom: 'Lachaab', poste: 'ailier_gauche', naissance: '2001-09-02' },
  { prenom: 'Maxime', nom: 'Lemoine', poste: 'attaquant', naissance: '1988-12-28' },
  { prenom: 'Ryad', nom: 'Habbas', poste: 'attaquant', naissance: '1997-07-16' },
  { prenom: 'Rémi', nom: 'Burnel', poste: 'attaquant', naissance: '1992-04-24' },
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
