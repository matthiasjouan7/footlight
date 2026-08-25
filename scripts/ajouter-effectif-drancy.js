// Ajoute les joueurs manquants de l'effectif Jeanne d'Arc de Drancy
// (National 2, saison 2026-2027) fourni par l'utilisateur (capture d'écran
// type transfermarkt). Reproduit le chemin "ajout manuel/scouté" de
// footlight-recherche.html (email synthétique @scoute.footlight.fr, profil
// non public, badge déclaratif) — pas de compte auth créé.
//
// "Défense" (sans précision) mappé sur defenseur_central, "Milieu gauche"
// (sans mapping dédié) mappé sur milieu_central. "Avant-centre" mappé sur
// attaquant.
//
// club = "Ja Drancy 1" (orthographe exacte de calendrier_officiel, division
// N2, confirmée via diagnostic-club-drancy.js — l'un des clubs du groupe E
// sans effectif enregistré).
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

const CLUB = 'Ja Drancy 1';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF JEANNE D'ARC DE DRANCY", 26/27).
const EFFECTIF = [
  { prenom: 'Anisse', nom: 'Derkaoui', poste: 'gardien', naissance: '1995-03-27' },
  { prenom: 'Anys', nom: 'Zouag', poste: 'gardien', naissance: '2007-05-07' },
  { prenom: 'Adama', nom: 'Koné', poste: 'defenseur_central', naissance: '2000-01-10' },
  { prenom: 'Antoine', nom: 'Metzler', poste: 'defenseur_central', naissance: '1993-06-19' },
  { prenom: 'Alexis', nom: 'Serichard', poste: 'defenseur_central', naissance: '2007-01-02' },
  { prenom: 'Billy', nom: 'Da Cruz Rocha', poste: 'defenseur_central', naissance: '2004-05-06' },
  { prenom: 'Francy', nom: 'Pene', poste: 'defenseur_central', naissance: '2006-05-14' },
  { prenom: 'Baba', nom: 'Traoré', poste: 'lateral_gauche', naissance: '1993-06-23' },
  { prenom: 'Jibryl', nom: 'Ben Belkasse', poste: 'lateral_gauche', naissance: '2004-08-04' },
  { prenom: 'Rayan', nom: 'Boukerroui', poste: 'lateral_gauche', naissance: '2007-08-23' },
  { prenom: 'Souleymane', nom: 'Fofana', poste: 'lateral_droit', naissance: '2000-05-10' },
  { prenom: 'Sorry', nom: 'Coulibaly', poste: 'lateral_droit', naissance: '2001-07-12' },
  { prenom: 'Malamine', nom: 'Camara', poste: 'milieu_defensif', naissance: '1999-01-27' },
  { prenom: 'Glodi', nom: 'Mafuala', poste: 'milieu_central', naissance: '1998-09-05' },
  { prenom: 'Abdramane', nom: 'Sanogo', poste: 'milieu_central', naissance: '1994-01-14' },
  { prenom: 'Moussa', nom: 'Dieye', poste: 'milieu_offensif', naissance: '2002-01-25' },
  { prenom: 'Iliane', nom: 'Hebbar', poste: 'milieu_offensif', naissance: '2005-01-15' },
  { prenom: 'Alassane', nom: 'Traoré', poste: 'ailier_gauche', naissance: '2000-02-10' },
  { prenom: 'Ali', nom: 'Tounkara', poste: 'attaquant', naissance: '1996-12-12' },
  { prenom: 'Amine', nom: 'Benatta', poste: 'attaquant', naissance: '2003-05-17' },
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
