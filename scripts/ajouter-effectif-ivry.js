// Ajoute les joueurs manquants de l'effectif US Ivry Football (National 2,
// saison 2026-2027) fourni par l'utilisateur (capture d'écran type
// transfermarkt). Reproduit le chemin "ajout manuel/scouté" de
// footlight-recherche.html (email synthétique @scoute.footlight.fr, profil
// non public, badge déclaratif) — pas de compte auth créé.
//
// "Défense" (sans précision) mappé sur defenseur_central, "Milieu" (sans
// précision) sur milieu_central, "Avant-centre" sur attaquant, comme pour
// les effectifs précédents.
//
// club = "Us Ivry Football 1" (orthographe exacte de calendrier_officiel,
// division N2, confirmée via diagnostic-club-ivry.js — l'un des clubs du
// groupe E sans effectif enregistré).
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

const CLUB = 'Us Ivry Football 1';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF US IVRY FOOTBALL", 26/27).
const EFFECTIF = [
  { prenom: 'Dembo', nom: 'Fofana', poste: 'gardien', naissance: '2000-01-01' },
  { prenom: 'Nassim', nom: 'Senkaz', poste: 'gardien', naissance: '2000-12-24' },
  { prenom: 'Anas', nom: 'Boussas', poste: 'defenseur_central', naissance: '1999-09-10' },
  { prenom: 'Bradley', nom: 'Kouadio', poste: 'defenseur_central', naissance: '2003-02-12' },
  { prenom: 'Selim', nom: 'Abdelaziz', poste: 'defenseur_central', naissance: '2003-04-18' },
  { prenom: 'Abderrahmane', nom: 'Tabbackh', poste: 'lateral_gauche', naissance: '1999-07-20' },
  { prenom: 'Brunel', nom: 'Lutundisa', poste: 'lateral_droit', naissance: '2002-07-19' },
  { prenom: 'Dan-Patrice', nom: 'Bikouta', poste: 'milieu_defensif', naissance: '2003-04-18' },
  { prenom: 'Mehdi', nom: 'Quehan', poste: 'milieu_central', naissance: '2001-03-16' },
  { prenom: 'Sami', nom: 'Baaboura', poste: 'milieu_central', naissance: '1994-12-02' },
  { prenom: 'Amin', nom: 'Oubachir', poste: 'milieu_central', naissance: '1998-05-28' },
  { prenom: 'Anthony', nom: 'Lages', poste: 'milieu_central', naissance: '1998-02-21' },
  { prenom: 'Kelyan', nom: 'Seraf', poste: 'milieu_central', naissance: '2000-10-27' },
  { prenom: 'Bréhima', nom: 'Traoré', poste: 'milieu_defensif', naissance: '2001-11-21' },
  { prenom: 'Harouna', nom: 'Diao', poste: 'milieu_central', naissance: '2006-04-26' },
  { prenom: 'Luca', nom: 'Spurio', poste: 'milieu_central', naissance: '1998-04-25' },
  { prenom: 'Hakeem', nom: 'Achour', poste: 'milieu_offensif', naissance: '1989-05-31' },
  { prenom: 'Fabio', nom: 'Vieira', poste: 'milieu_offensif', naissance: '2000-10-03' },
  { prenom: 'Kipré', nom: 'Yao', poste: 'ailier_droit', naissance: '2003-10-07' },
  { prenom: 'Abdourahmane', nom: 'Fofana', poste: 'attaquant', naissance: '1998-01-01' },
  { prenom: 'Mouhamed', nom: 'Thiam', poste: 'attaquant', naissance: '2001-10-05' },
  { prenom: 'Kilian', nom: 'Point du Jour', poste: 'attaquant', naissance: '2004-02-03' },
  { prenom: 'Yani', nom: 'Benighil', poste: 'attaquant', naissance: '2006-06-17' },
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
