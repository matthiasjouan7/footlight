// Ajoute les joueurs manquants de l'effectif Dijon FCO B (National 2,
// saison 2026-2027) fourni par l'utilisateur (capture d'écran type
// transfermarkt). Reproduit le chemin "ajout manuel/scouté" de
// footlight-recherche.html (email synthétique @scoute.footlight.fr, profil
// non public, badge déclaratif) — pas de compte auth créé.
//
// "Milieu" (sans précision) mappé sur milieu_central. "Avant-centre" mappé
// sur attaquant. Deux joueurs sans date de naissance affichée sur la
// capture (Malo Boleda, Joël Bertrand Bayala) : naissance laissée vide.
//
// club = CLUB ci-dessous (orthographe exacte de calendrier_officiel,
// division N2, à confirmer via diagnostic-club-dijon-b.js).
//
// Anti-doublon : lecture PAGINÉE de la table joueurs (>2900 lignes, au-delà
// de la limite par défaut de 1000 lignes de PostgREST) pour ne manquer
// aucun joueur existant. Plusieurs joueurs de la capture portent une icône
// de prêt — s'ils sont détectés en base sous un autre club, ne PAS
// modifier leur club sans confirmation explicite de l'utilisateur.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const CLUB = 'Dijon Fco 2';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF DIJON FCO B", 26/27).
const EFFECTIF = [
  { prenom: 'Sébastien', nom: 'Koula Tou', poste: 'gardien', naissance: '2004-12-01' },
  { prenom: 'Enzo', nom: 'Ketterle', poste: 'gardien', naissance: '2003-08-16' },
  { prenom: 'Joakim', nom: 'Loureiro', poste: 'gardien', naissance: '2003-01-13' },
  { prenom: 'Malo', nom: 'Boleda', poste: 'gardien', naissance: null },
  { prenom: 'Hugo', nom: 'Ketterle', poste: 'defenseur_central', naissance: '2003-08-16' },
  { prenom: 'Lucas', nom: 'Ntazambi', poste: 'defenseur_central', naissance: '2006-03-29' },
  { prenom: 'Boubacar', nom: 'Diallo', poste: 'lateral_gauche', naissance: '2005-07-17' },
  { prenom: 'Malone', nom: 'Boucard', poste: 'lateral_gauche', naissance: '2006-11-01' },
  { prenom: 'Amaury', nom: 'Jaurès', poste: 'lateral_droit', naissance: '2003-01-24' },
  { prenom: 'Joël Bertrand', nom: 'Bayala', poste: 'milieu_central', naissance: null },
  { prenom: 'Ylan', nom: 'Aka', poste: 'milieu_central', naissance: '2006-12-12' },
  { prenom: 'Hamidou', nom: 'Kanté', poste: 'milieu_central', naissance: '2007-01-11' },
  { prenom: 'Faïss', nom: 'Mahamat-Bindi', poste: 'milieu_central', naissance: '2007-08-14' },
  { prenom: 'Baptiste', nom: 'Benoist', poste: 'milieu_offensif', naissance: '2007-07-16' },
  { prenom: 'Wassim', nom: 'Moussaoui', poste: 'milieu_offensif', naissance: '2007-11-29' },
  { prenom: 'Florian', nom: 'Rombogouera', poste: 'ailier_gauche', naissance: '2006-02-20' },
  { prenom: 'Chams', nom: 'Soule', poste: 'ailier_droit', naissance: '2007-03-24' },
  { prenom: 'Jallal', nom: 'Yansané', poste: 'attaquant', naissance: '2006-04-26' },
  { prenom: 'Pierre', nom: 'Bikoi Bi Bikoi', poste: 'attaquant', naissance: '2007-08-10' },
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
