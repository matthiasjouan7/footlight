// Ajoute les joueurs manquants de l'effectif FC Mulhouse (National 2,
// saison 2026-2027) fourni par l'utilisateur (capture d'écran type
// transfermarkt). Reproduit le chemin "ajout manuel/scouté" de
// footlight-recherche.html (email synthétique @scoute.footlight.fr, profil
// non public, badge déclaratif) — pas de compte auth créé.
//
// "Défense" (sans précision) mappé sur defenseur_central, "Milieu gauche"
// (sans mapping dédié) mappé sur milieu_central. "Avant-centre" mappé sur
// attaquant.
//
// club = "Mulhouse Fc 1" (orthographe exacte de calendrier_officiel,
// division N2, confirmée via diagnostic-club-mulhouse.js — l'un des clubs
// du groupe E sans effectif enregistré).
//
// Anti-doublon : lecture PAGINÉE de la table joueurs (>2900 lignes, au-delà
// de la limite par défaut de 1000 lignes de PostgREST) pour ne manquer
// aucun joueur existant. La quasi-totalité des joueurs de la capture
// porte une icône de prêt — s'ils sont détectés en base sous un autre
// club, ne PAS modifier leur club sans confirmation explicite de
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

const CLUB = 'Mulhouse Fc 1';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF FC MULHOUSE", 26/27).
const EFFECTIF = [
  { prenom: 'Axel', nom: 'Gentner', poste: 'gardien', naissance: '2003-01-24' },
  { prenom: 'Martin', nom: 'Haderbache', poste: 'defenseur_central', naissance: '2001-07-02' },
  { prenom: 'Mouhameth', nom: 'Sané', poste: 'defenseur_central', naissance: '1996-01-26' },
  { prenom: 'Arnaud', nom: 'Gherardi', poste: 'defenseur_central', naissance: '1994-12-06' },
  { prenom: 'Wilson', nom: 'Mendy', poste: 'defenseur_central', naissance: '2000-07-29' },
  { prenom: 'Tom', nom: 'Maréchal', poste: 'defenseur_central', naissance: '2002-03-16' },
  { prenom: 'Lilian', nom: 'Taoko', poste: 'defenseur_central', naissance: '2007-01-10' },
  { prenom: 'Félicien', nom: 'Koensgen', poste: 'defenseur_central', naissance: '2007-02-20' },
  { prenom: 'David', nom: 'Limbaka', poste: 'defenseur_central', naissance: '2007-07-04' },
  { prenom: 'Joakim', nom: 'Balmy', poste: 'lateral_gauche', naissance: '1997-09-17' },
  { prenom: 'Sindou', nom: 'Karamoko', poste: 'lateral_gauche', naissance: '1998-04-06' },
  { prenom: 'Pepito', nom: 'Kisuba', poste: 'lateral_gauche', naissance: '2002-04-07' },
  { prenom: 'Samir', nom: 'Kecha', poste: 'lateral_droit', naissance: '1988-03-03' },
  { prenom: 'Abdoulwadoud', nom: 'Kébé', poste: 'lateral_droit', naissance: '1999-01-30' },
  { prenom: 'Kerfala', nom: 'Sylla', poste: 'milieu_defensif', naissance: '2003-08-02' },
  { prenom: 'Lilian', nom: 'Perrier', poste: 'milieu_defensif', naissance: '2000-01-30' },
  { prenom: 'Allan', nom: 'Amoros', poste: 'milieu_defensif', naissance: '2002-04-20' },
  { prenom: 'Tiziano', nom: 'Horn', poste: 'milieu_central', naissance: '2004-08-28' },
  { prenom: 'Kacem', nom: 'Amaouche', poste: 'milieu_offensif', naissance: '1992-10-24' },
  { prenom: 'Ayoub', nom: 'Sefraoui', poste: 'milieu_offensif', naissance: '2000-01-17' },
  { prenom: 'Elias', nom: 'Smaali', poste: 'milieu_offensif', naissance: '2006-06-24' },
  { prenom: "Ali", nom: "M'Madi", poste: 'ailier_gauche', naissance: '1990-04-21' },
  { prenom: 'Fred', nom: 'Akamba', poste: 'ailier_gauche', naissance: '2007-11-18' },
  { prenom: 'Florian', nom: 'Elhani', poste: 'ailier_droit', naissance: '1997-04-29' },
  { prenom: 'Loutfi', nom: 'Daoudou', poste: 'attaquant', naissance: '1997-09-28' },
  { prenom: 'Théo', nom: 'Walter', poste: 'attaquant', naissance: '1997-01-29' },
  { prenom: 'Mickaël', nom: 'Gaougaou', poste: 'attaquant', naissance: '1999-01-22' },
  { prenom: 'Jonathan', nom: 'Cavalier', poste: 'attaquant', naissance: '2003-05-27' },
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
