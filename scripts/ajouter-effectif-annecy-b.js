// Ajoute les joueurs manquants de l'effectif FC Annecy B (National 2,
// saison 2026-2027) fourni par l'utilisateur (capture d'écran type
// transfermarkt). Reproduit le chemin "ajout manuel/scouté" de
// footlight-recherche.html (email synthétique @scoute.footlight.fr, profil
// non public, badge déclaratif) — pas de compte auth créé.
//
// "Défense" et "Milieu" (sans précision) mappés respectivement sur
// defenseur_central et milieu_central. "Avant-centre" mappé sur attaquant.
//
// club = CLUB ci-dessous (orthographe exacte de calendrier_officiel,
// division N2, à confirmer via diagnostic-club-annecy-b.js).
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

const CLUB = "Fc D'Annecy 2";
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF FC ANNECY B", 26/27).
const EFFECTIF = [
  { prenom: 'Gabin', nom: 'Secrétant', poste: 'defenseur_central', naissance: '2008-10-20' },
  { prenom: 'Yoann', nom: 'Dumay', poste: 'defenseur_central', naissance: '2004-08-01' },
  { prenom: 'Idriss', nom: 'Monteville', poste: 'lateral_gauche', naissance: '2005-03-29' },
  { prenom: 'Randy', nom: 'Baleka', poste: 'milieu_defensif', naissance: '2006-01-22' },
  { prenom: 'Mathieu', nom: 'Masola', poste: 'milieu_central', naissance: '2007-12-08' },
  { prenom: 'Pitshou', nom: 'Etshélé', poste: 'milieu_central', naissance: '2008-06-28' },
  { prenom: 'Tom', nom: 'Palma', poste: 'milieu_offensif', naissance: '2005-05-29' },
  { prenom: 'Thym-Gory', nom: 'Makengo', poste: 'ailier_gauche', naissance: '2006-11-14' },
  { prenom: 'Olivier', nom: 'Picabea', poste: 'ailier_droit', naissance: '2003-05-10' },
  { prenom: 'Cyrus', nom: 'Biz', poste: 'attaquant', naissance: '2006-07-18' },
  { prenom: 'Sonny', nom: 'Yvars', poste: 'attaquant', naissance: '2008-04-05' },
  { prenom: 'Noa', nom: 'Borella', poste: 'attaquant', naissance: '2006-08-27' },
  { prenom: 'Adji Joel', nom: 'Aharrh Gnama', poste: 'attaquant', naissance: '1998-02-20' },
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
