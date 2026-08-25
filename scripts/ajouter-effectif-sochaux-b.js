// Ajoute les joueurs manquants de l'effectif FC Sochaux-Montbéliard B
// (National 2, saison 2026-2027) fourni par l'utilisateur (capture d'écran
// type transfermarkt). Reproduit le chemin "ajout manuel/scouté" de
// footlight-recherche.html (email synthétique @scoute.footlight.fr, profil
// non public, badge déclaratif) — pas de compte auth créé.
//
// "Défense" (sans précision) mappé sur defenseur_central, "Arrière droit"
// sur lateral_droit, "Milieu" (sans précision) sur milieu_central, comme
// pour les effectifs précédents.
//
// club = "Sochaux Montb. Fc 2" (orthographe exacte de calendrier_officiel,
// division N2, confirmée via diagnostic-club-sochaux-b.js — l'un des clubs
// du groupe E sans effectif enregistré).
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

const CLUB = 'Sochaux Montb. Fc 2';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF FC SOCHAUX-MONTBÉLIARD B", 26/27).
const EFFECTIF = [
  { prenom: 'Grégory', nom: 'Hoareau', poste: 'gardien', naissance: '2007-01-07' },
  { prenom: 'Matthis', nom: 'Schübler-Lecart', poste: 'gardien', naissance: '2007-01-18' },
  { prenom: 'Mohamed', nom: 'Touré', poste: 'defenseur_central', naissance: '2005-12-12' },
  { prenom: 'Albin', nom: 'Mustafic', poste: 'defenseur_central', naissance: '2006-04-13' },
  { prenom: 'Khadim', nom: 'Sarr', poste: 'lateral_gauche', naissance: '2007-03-13' },
  { prenom: 'Séga', nom: 'Sanogo', poste: 'lateral_droit', naissance: '2005-07-15' },
  { prenom: 'Pierre', nom: 'Sanchez', poste: 'lateral_droit', naissance: '2007-05-04' },
  { prenom: 'Bryan', nom: 'Leal Moreira', poste: 'milieu_defensif', naissance: '2006-06-14' },
  { prenom: 'Mohamed', nom: 'Dansoko', poste: 'milieu_central', naissance: '2006-10-03' },
  { prenom: 'Pape Yatma', nom: 'Diop', poste: 'milieu_defensif', naissance: '2005-12-04' },
  { prenom: 'Adama', nom: 'Cissé', poste: 'milieu_defensif', naissance: '2007-05-28' },
  { prenom: 'Adriano', nom: 'Delphis', poste: 'milieu_offensif', naissance: '2007-05-28' },
  { prenom: 'Noah', nom: 'Gomes', poste: 'milieu_offensif', naissance: '2007-10-22' },
  { prenom: 'Alan', nom: 'Bikoumou', poste: 'ailier_gauche', naissance: '2005-01-12' },
  { prenom: 'Bisnat', nom: 'Mbala', poste: 'ailier_droit', naissance: '2006-07-07' },
  { prenom: 'David', nom: 'Tebili', poste: 'attaquant', naissance: '2005-02-15' },
  { prenom: 'Noa', nom: 'Kotto Kotto Mouyema', poste: 'attaquant', naissance: '2006-01-05' },
  { prenom: 'Joshua', nom: 'Frau', poste: 'attaquant', naissance: '2007-10-25' },
  { prenom: 'Adam', nom: 'Zenati', poste: 'attaquant', naissance: '2006-08-13' },
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
