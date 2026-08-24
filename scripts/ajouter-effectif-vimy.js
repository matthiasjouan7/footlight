// Ajoute les joueurs manquants de l'effectif US Vimy (National 2, saison
// 2026-2027) fourni par l'utilisateur (capture d'écran type transfermarkt).
// Reproduit le chemin "ajout manuel/scouté" de footlight-recherche.html
// (email synthétique @scoute.footlight.fr, profil non public, badge
// déclaratif) — pas de compte auth créé.
//
// club = "Vimy Us 1" (orthographe exacte de calendrier_officiel, division
// N2, confirmée via diagnostic-club-vimy.js — l'un des clubs du groupe D
// sans effectif enregistré, identifié via
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

const CLUB = 'Vimy Us 1';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF US VIMY", 26/27).
const EFFECTIF = [
  { prenom: 'Yann', nom: 'Le Meur', poste: 'gardien', naissance: '1999-08-07' },
  { prenom: 'Eliaz', nom: 'Crombez', poste: 'gardien', naissance: '2007-08-16' },
  { prenom: 'Nicolas', nom: 'Lekien', poste: 'gardien', naissance: '2003-11-21' },
  { prenom: 'Louis', nom: 'Wechman', poste: 'defenseur_central', naissance: '2003-10-13' },
  { prenom: 'Lucas', nom: 'Durand', poste: 'defenseur_central', naissance: '2007-11-29' },
  { prenom: 'Christopher', nom: 'Talmant', poste: 'defenseur_central', naissance: '2001-05-16' },
  { prenom: 'Florian', nom: 'Latte', poste: 'defenseur_central', naissance: '2000-10-27' },
  { prenom: 'Sosthène', nom: 'Ouraga', poste: 'lateral_gauche', naissance: '2002-02-04' },
  { prenom: 'Sékou', nom: 'Dramé', poste: 'lateral_gauche', naissance: '2005-06-06' },
  { prenom: 'Anis', nom: 'Bendif', poste: 'lateral_droit', naissance: '2006-02-11' },
  { prenom: 'Clément', nom: 'Kowalczuk', poste: 'lateral_droit', naissance: '1998-05-20' },
  { prenom: 'Quenhima', nom: 'Unjanqui', poste: 'milieu_defensif', naissance: '2002-09-02' },
  { prenom: 'Souleymane', nom: 'Diarra', poste: 'milieu_central', naissance: '1995-01-30' },
  { prenom: 'Romain', nom: 'Fichex', poste: 'milieu_central', naissance: '1998-01-18' },
  { prenom: 'José', nom: 'Machado', poste: 'milieu_central', naissance: '1997-05-21' },
  { prenom: 'Yanis', nom: 'El Oueraouy', poste: 'milieu_central', naissance: '2004-03-31' },
  { prenom: 'Lilian', nom: 'Anselin', poste: 'milieu_offensif', naissance: '2008-03-27' },
  { prenom: 'Théo', nom: 'Lemattre', poste: 'milieu_offensif', naissance: '2001-11-28' },
  { prenom: 'Messaoud', nom: 'Bouardja', poste: 'ailier_gauche', naissance: '1991-07-06' },
  { prenom: 'Nicolas', nom: 'Baybaud', poste: 'ailier_gauche', naissance: '2004-07-11' },
  { prenom: 'Aboubacar', nom: 'Doumbia', poste: 'ailier_droit', naissance: '1995-04-19' },
  { prenom: 'Faissal', nom: 'Kehli', poste: 'attaquant', naissance: '2000-09-08' },
  { prenom: 'Sacha', nom: 'Kadi', poste: 'attaquant', naissance: '2006-05-26' },
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
