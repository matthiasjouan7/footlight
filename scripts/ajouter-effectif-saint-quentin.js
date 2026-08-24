// Ajoute les joueurs manquants de l'effectif Olympique Saint-Quentin
// (National 2, saison 2026-2027) fourni par l'utilisateur (capture d'écran
// type transfermarkt). Reproduit le chemin "ajout manuel/scouté" de
// footlight-recherche.html (email synthétique @scoute.footlight.fr, profil
// non public, badge déclaratif) — pas de compte auth créé.
//
// club = "St Quentin O. 1" (orthographe exacte de calendrier_officiel,
// division N2, confirmée via diagnostic-club-saint-quentin.js — l'un des
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

const CLUB = 'St Quentin O. 1';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF OLYMPIQUE SAINT-QUENTIN", 26/27).
const EFFECTIF = [
  { prenom: 'Alex', nom: 'Mendes', poste: 'gardien', naissance: '1992-08-14' },
  { prenom: 'Matthieu', nom: 'Hucliez', poste: 'gardien', naissance: '1995-08-26' },
  { prenom: 'Quentin', nom: 'Mielcarek', poste: 'gardien', naissance: '2001-05-06' },
  { prenom: 'Zakha', nom: 'Bangoura', poste: 'defenseur_central', naissance: '2001-06-22' },
  { prenom: 'Valentin', nom: 'Williot', poste: 'defenseur_central', naissance: '2007-04-08' },
  { prenom: 'Mattéo', nom: 'Escouflaire', poste: 'lateral_gauche', naissance: '2005-05-26' },
  { prenom: 'Paul', nom: 'Paris', poste: 'lateral_gauche', naissance: '2007-08-30' },
  { prenom: 'Lilian', nom: "N'Goma", poste: 'lateral_droit', naissance: '1998-06-15' },
  { prenom: 'Melvin', nom: 'Houenou', poste: 'lateral_droit', naissance: '1998-10-15' },
  { prenom: 'Youssef', nom: 'Sylla', poste: 'milieu_defensif', naissance: '1990-10-17' },
  { prenom: 'Anthony', nom: 'Boucher', poste: 'milieu_defensif', naissance: '1990-11-05' },
  { prenom: 'Aboubacar', nom: 'Touré', poste: 'milieu_defensif', naissance: '1992-04-22' },
  { prenom: 'Khalid', nom: 'Oulaaouane', poste: 'milieu_defensif', naissance: '2001-10-20' },
  { prenom: 'Keylian', nom: 'Godet', poste: 'milieu_defensif', naissance: '2005-10-11' },
  { prenom: 'Sofiane', nom: 'Gourch', poste: 'milieu_offensif', naissance: '2000-01-14' },
  { prenom: 'Plamedi', nom: 'de Sousa', poste: 'milieu_offensif', naissance: '2002-01-10' },
  { prenom: 'Evan', nom: 'Garot', poste: 'milieu_offensif', naissance: '2006-01-05' },
  { prenom: 'Samba', nom: 'Tamboura', poste: 'ailier_gauche', naissance: '2000-12-30' },
  { prenom: 'Ibrahim', nom: 'Mandefu', poste: 'attaquant', naissance: '2001-01-24' },
  { prenom: 'Maxime', nom: 'Duflot', poste: 'attaquant', naissance: '2000-03-27' },
  { prenom: 'Lassiné', nom: 'Fofana', poste: 'attaquant', naissance: '1999-02-26' },
  { prenom: 'Zakaria', nom: 'Bouchema', poste: 'attaquant', naissance: '2005-06-25' },
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
