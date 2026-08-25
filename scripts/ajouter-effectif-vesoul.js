// Ajoute les joueurs manquants de l'effectif Football Club de Vesoul
// (National 2, saison 2026-2027) fourni par l'utilisateur (capture d'écran
// type transfermarkt). Reproduit le chemin "ajout manuel/scouté" de
// footlight-recherche.html (email synthétique @scoute.footlight.fr, profil
// non public, badge déclaratif) — pas de compte auth créé.
//
// "Milieu" (sans précision) mappé sur milieu_central. "Avant-centre" mappé
// sur attaquant.
//
// club = CLUB ci-dessous (orthographe exacte de calendrier_officiel,
// division N2, confirmée via diagnostic-club-vesoul.js : "Vesoul Fc 1").
//
// Anti-doublon : lecture PAGINÉE de la table joueurs (>2900 lignes, au-delà
// de la limite par défaut de 1000 lignes de PostgREST) pour ne manquer
// aucun joueur existant. Plusieurs joueurs de la capture portent une icône
// de prêt (Arthur Vichet, Titus Owona, Mahamadou Saburu, Elias Rigault,
// Hugo Voirol, Tom Gérome, Philippe Etoughe) — s'ils sont détectés en base
// sous un autre club, ne PAS modifier leur club sans confirmation explicite
// de l'utilisateur.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const CLUB = 'Vesoul Fc 1';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF FOOTBALL CLUB DE VESOUL", 26/27).
const EFFECTIF = [
  { prenom: 'Arthur', nom: 'Vichet', poste: 'gardien', naissance: '2003-10-09' },
  { prenom: 'Gabin', nom: 'Droit', poste: 'gardien', naissance: '2002-04-24' },
  { prenom: 'Thomas', nom: 'Domingos', poste: 'defenseur_central', naissance: '1996-09-04' },
  { prenom: 'Titus', nom: 'Owona', poste: 'defenseur_central', naissance: '2000-03-18' },
  { prenom: 'Mahamadou', nom: 'Saburu', poste: 'lateral_gauche', naissance: '1994-04-27' },
  { prenom: 'Elias', nom: 'Rigault', poste: 'lateral_gauche', naissance: '2001-03-10' },
  { prenom: 'Hugo', nom: 'Voirol', poste: 'milieu_defensif', naissance: '1999-05-04' },
  { prenom: 'Matias', nom: 'Pereira', poste: 'milieu_defensif', naissance: '2002-08-24' },
  { prenom: 'Naiya', nom: 'Mahamat', poste: 'milieu_central', naissance: '2003-08-11' },
  { prenom: 'Léo', nom: 'Berthoz', poste: 'milieu_central', naissance: '2001-07-28' },
  { prenom: 'Tom', nom: 'Gérome', poste: 'milieu_central', naissance: '2006-02-15' },
  { prenom: 'Sofiane', nom: 'Khadda', poste: 'milieu_central', naissance: '1991-12-23' },
  { prenom: 'Giany', nom: 'Di Capua', poste: 'milieu_central', naissance: '2003-11-21' },
  { prenom: 'Haris', nom: 'El Mouttaqi', poste: 'ailier_gauche', naissance: '2000-08-19' },
  { prenom: 'Guillaume', nom: 'Fauqueur', poste: 'ailier_droit', naissance: '2004-06-21' },
  { prenom: 'Philippe', nom: 'Etoughe', poste: 'attaquant', naissance: '1995-12-10' },
  { prenom: 'Jérémy', nom: 'Dorard', poste: 'attaquant', naissance: '2000-02-27' },
  { prenom: 'Ange', nom: 'Toumaleu', poste: 'attaquant', naissance: '2003-02-10' },
  { prenom: 'Matis', nom: 'Yerbe', poste: 'attaquant', naissance: '2004-06-18' },
  { prenom: 'Gautier', nom: 'Véjux', poste: 'attaquant', naissance: '1997-05-03' },
  { prenom: 'Lucien', nom: 'Matrisciano', poste: 'attaquant', naissance: '2004-06-17' },
  { prenom: 'Maxence', nom: 'Aristidini', poste: 'attaquant', naissance: '2005-02-18' },
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
