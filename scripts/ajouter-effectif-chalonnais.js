// Ajoute les joueurs manquants de l'effectif FC Chalonnais (National 2,
// saison 2026-2027) fourni par l'utilisateur (capture d'écran type
// transfermarkt). Reproduit le chemin "ajout manuel/scouté" de
// footlight-recherche.html (email synthétique @scoute.footlight.fr, profil
// non public, badge déclaratif) — pas de compte auth créé.
//
// "Milieu" (sans précision) mappé sur milieu_central. "Avant-centre" mappé
// sur attaquant.
//
// club = CLUB ci-dessous (orthographe exacte de calendrier_officiel,
// division N2, à confirmer via diagnostic-club-chalonnais.js).
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

const CLUB = 'Chalon Fc 1';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF FC CHALONNAIS", 26/27).
const EFFECTIF = [
  { prenom: 'Jules', nom: 'Bosne Vialet', poste: 'gardien', naissance: '1996-04-02' },
  { prenom: 'Onehi', nom: 'Momoh', poste: 'gardien', naissance: '1999-12-14' },
  { prenom: 'Sonhy', nom: 'Sefil', poste: 'defenseur_central', naissance: '1994-06-16' },
  { prenom: 'Sasha', nom: 'Carriez', poste: 'defenseur_central', naissance: '2007-02-27' },
  { prenom: 'Julien', nom: 'Renaudot', poste: 'defenseur_central', naissance: '2006-01-04' },
  { prenom: 'Jérrold', nom: 'Nyemeck', poste: 'lateral_droit', naissance: '1994-05-07' },
  { prenom: 'Rudolf', nom: 'Barrigah', poste: 'lateral_droit', naissance: '2001-05-24' },
  { prenom: 'Robinho', nom: 'Besini', poste: 'lateral_droit', naissance: '2005-03-28' },
  { prenom: 'Victor', nom: 'Boron', poste: 'milieu_defensif', naissance: '2000-03-24' },
  { prenom: 'Jassem', nom: 'Azraine', poste: 'milieu_central', naissance: '2002-01-20' },
  { prenom: 'Amir', nom: 'Ouchem', poste: 'milieu_central', naissance: '2000-07-14' },
  { prenom: 'Dimitri', nom: 'Bamballi', poste: 'milieu_central', naissance: '2006-05-24' },
  { prenom: 'Romain', nom: 'Grandet', poste: 'milieu_central', naissance: '2006-02-05' },
  { prenom: 'Prince', nom: 'Kibouka', poste: 'milieu_defensif', naissance: '2001-06-13' },
  { prenom: 'Simon', nom: 'Le Bras', poste: 'milieu_central', naissance: '2004-01-21' },
  { prenom: 'Enzo', nom: 'Nanor', poste: 'milieu_central', naissance: '2006-08-17' },
  { prenom: 'Alexis', nom: 'Guérin', poste: 'milieu_offensif', naissance: '2000-08-05' },
  { prenom: 'Salah-Hichem', nom: 'Chergui', poste: 'milieu_offensif', naissance: '1997-01-07' },
  { prenom: 'Dalil', nom: 'Ouchem', poste: 'milieu_offensif', naissance: '2009-06-08' },
  { prenom: 'Noa', nom: 'Alexandre', poste: 'ailier_gauche', naissance: '2005-02-27' },
  { prenom: 'Lilian', nom: 'Deruytere', poste: 'ailier_droit', naissance: '2003-01-04' },
  { prenom: 'Boris', nom: 'Mathis', poste: 'attaquant', naissance: '1997-08-15' },
  { prenom: 'Théo', nom: 'Bréant', poste: 'attaquant', naissance: '1997-12-01' },
  { prenom: 'Oussama', nom: 'Aït-Fana', poste: 'attaquant', naissance: '2000-07-08' },
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
