// Ajoute les joueurs manquants de l'effectif APM Metz (National 2, saison
// 2026-2027) fourni par l'utilisateur (capture d'écran type transfermarkt).
// Reproduit le chemin "ajout manuel/scouté" de footlight-recherche.html
// (email synthétique @scoute.footlight.fr, profil non public, badge
// déclaratif) — pas de compte auth créé.
//
// "Milieu" (sans précision) mappé sur milieu_central. "Avant-centre" mappé
// sur attaquant.
//
// club = "Metz Apm Fc 1" (orthographe exacte de calendrier_officiel,
// division N2, confirmée via diagnostic-club-apm-metz.js — l'un des clubs
// du groupe E sans effectif enregistré).
//
// Anti-doublon : lecture PAGINÉE de la table joueurs (>2900 lignes, au-delà
// de la limite par défaut de 1000 lignes de PostgREST) pour ne manquer
// aucun joueur existant. La quasi-totalité des joueurs de la capture porte
// une icône de prêt — s'ils sont détectés en base sous un autre club, ne
// PAS modifier leur club sans confirmation explicite de l'utilisateur.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const CLUB = 'Metz Apm Fc 1';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF APM METZ", 26/27).
const EFFECTIF = [
  { prenom: 'Antoine', nom: 'Seyer', poste: 'gardien', naissance: '1997-07-30' },
  { prenom: 'Quentin', nom: 'Keldenich', poste: 'gardien', naissance: '1996-06-10' },
  { prenom: 'Jules', nom: 'Merotto', poste: 'gardien', naissance: '2007-10-28' },
  { prenom: 'Lucas', nom: 'Toussaint', poste: 'defenseur_central', naissance: '1996-03-29' },
  { prenom: 'Ulysse', nom: 'Barthélémy', poste: 'defenseur_central', naissance: '1996-05-15' },
  { prenom: 'Jean-Marc', nom: 'Kra', poste: 'defenseur_central', naissance: '2003-11-16' },
  { prenom: 'Mohamed', nom: 'Akandji', poste: 'defenseur_central', naissance: '2001-10-22' },
  { prenom: 'Bryan', nom: 'Mélisse', poste: 'lateral_gauche', naissance: '1989-03-25' },
  { prenom: "Assane", nom: "N'Doye", poste: 'lateral_gauche', naissance: '2004-06-11' },
  { prenom: 'Romain', nom: 'Sabater', poste: 'lateral_gauche', naissance: '2003-02-26' },
  { prenom: 'Valentin', nom: 'Poinsignon', poste: 'lateral_droit', naissance: '1994-03-23' },
  { prenom: 'Roman', nom: 'Pierrard', poste: 'lateral_droit', naissance: '1997-09-11' },
  { prenom: 'Nathan', nom: 'Plaisance', poste: 'lateral_droit', naissance: '2004-05-23' },
  { prenom: 'Jacques', nom: 'Watrone', poste: 'milieu_central', naissance: '2001-08-22' },
  { prenom: 'Fayçal', nom: 'Kerdoud', poste: 'milieu_defensif', naissance: '2000-06-29' },
  { prenom: 'Lilian', nom: 'Clausse', poste: 'milieu_central', naissance: '2000-10-23' },
  { prenom: 'Yaniss', nom: 'Abdallah', poste: 'milieu_central', naissance: '2003-11-19' },
  { prenom: 'Samy', nom: 'Kehli', poste: 'milieu_offensif', naissance: '1991-01-27' },
  { prenom: 'Baga', nom: 'Camara', poste: 'milieu_offensif', naissance: '2001-02-02' },
  { prenom: 'Kamil', nom: 'Djecta', poste: 'milieu_offensif', naissance: '1999-07-25' },
  { prenom: 'Bastien', nom: 'Frassineti', poste: 'milieu_offensif', naissance: '1996-02-14' },
  { prenom: 'Sacha', nom: 'Becker', poste: 'milieu_offensif', naissance: '2001-10-02' },
  { prenom: 'Ugo', nom: 'Fernandes', poste: 'milieu_offensif', naissance: '2004-03-20' },
  { prenom: 'Jules', nom: 'Jager', poste: 'milieu_offensif', naissance: '2003-07-06' },
  { prenom: 'Evann', nom: 'Clerc', poste: 'milieu_offensif', naissance: '2007-09-01' },
  { prenom: 'Bambo', nom: 'Diakhon', poste: 'ailier_droit', naissance: '2002-08-17' },
  { prenom: 'Thibaut', nom: 'Jacquel', poste: 'attaquant', naissance: '1997-03-23' },
  { prenom: 'Paul', nom: 'Maurice', poste: 'attaquant', naissance: '1996-05-14' },
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
