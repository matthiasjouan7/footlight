// Ajoute les joueurs manquants de l'effectif FCM Aubervilliers (National 2,
// saison 2026-2027) fourni par l'utilisateur (capture d'écran type
// transfermarkt). Reproduit le chemin "ajout manuel/scouté" de
// footlight-recherche.html (email synthétique @scoute.footlight.fr, profil
// non public, badge déclaratif) — pas de compte auth créé.
//
// "Milieu gauche" (sans mapping dédié) traité comme générique et mappé sur
// milieu_central, comme les autres postes "Milieu" sans précision.
//
// club = "Aubervilliers Fcm 1" (orthographe exacte de calendrier_officiel,
// division N2, confirmée via diagnostic-club-aubervilliers.js — l'un des
// clubs du groupe E sans effectif enregistré).
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

const CLUB = 'Aubervilliers Fcm 1';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF FCM AUBERVILLIERS", 26/27).
const EFFECTIF = [
  { prenom: "N'Drin Ulrich", nom: 'Edan', poste: 'gardien', naissance: '1992-10-19' },
  { prenom: 'Jordy', nom: 'Kaloukadilandi', poste: 'defenseur_central', naissance: '1993-05-19' },
  { prenom: 'Prosper', nom: 'João Cláudio', poste: 'lateral_gauche', naissance: '2003-03-05' },
  { prenom: 'Kévin', nom: 'Badeau', poste: 'lateral_droit', naissance: '1998-02-24' },
  { prenom: 'Elvis', nom: 'Kuyema', poste: 'lateral_droit', naissance: '1995-04-30' },
  { prenom: 'Kévin', nom: 'Miriezolo', poste: 'lateral_droit', naissance: '1992-10-01' },
  { prenom: 'Alpha', nom: 'Kaba', poste: 'lateral_droit', naissance: '1998-11-29' },
  { prenom: 'Issa', nom: 'Niakaté', poste: 'milieu_defensif', naissance: '1992-10-09' },
  { prenom: 'Nouha', nom: 'Camara', poste: 'milieu_defensif', naissance: '1992-04-13' },
  { prenom: 'Demba', nom: 'Konté', poste: 'milieu_defensif', naissance: '1993-09-08' },
  { prenom: 'Al Amin', nom: 'Aïd', poste: 'milieu_central', naissance: '2004-09-30' },
  { prenom: 'Yanis', nom: 'Bouaddi', poste: 'milieu_central', naissance: '1999-03-19' },
  { prenom: 'Masiré', nom: 'Konaté', poste: 'milieu_central', naissance: '2000-04-04' },
  { prenom: 'Bandiougou', nom: 'Dabo', poste: 'milieu_central', naissance: '1997-12-05' },
  { prenom: 'Johnley', nom: 'Chéry', poste: 'milieu_central', naissance: '1994-09-20' },
  { prenom: 'Bilal', nom: 'Harragui', poste: 'milieu_offensif', naissance: '1996-08-22' },
  { prenom: 'Samir', nom: 'Saïb', poste: 'milieu_offensif', naissance: '2004-02-26' },
  { prenom: 'Marc-Evy', nom: 'Ousseni', poste: 'ailier_gauche', naissance: '1996-06-24' },
  { prenom: 'Noah', nom: 'Katumbere', poste: 'attaquant', naissance: '2006-07-22' },
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
