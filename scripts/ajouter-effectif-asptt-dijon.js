// Ajoute les joueurs manquants de l'effectif ASPTT Dijon (National 2, saison
// 2026-2027) fourni par l'utilisateur (capture d'écran type transfermarkt).
// Reproduit le chemin "ajout manuel/scouté" de footlight-recherche.html
// (email synthétique @scoute.footlight.fr, profil non public, badge
// déclaratif) — pas de compte auth créé.
//
// "Défense" et "Milieu" (sans précision) mappés respectivement sur
// defenseur_central et milieu_central. "Avant-centre" mappé sur attaquant.
//
// club = "Asptt Dijon 1" (orthographe exacte de calendrier_officiel,
// division N2, confirmée via diagnostic-club-dijon-b.js).
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

const CLUB = 'Asptt Dijon 1';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF ASPTT DIJON", 26/27).
const EFFECTIF = [
  { prenom: 'Gabin', nom: 'Eudes', poste: 'gardien', naissance: '2005-08-09' },
  { prenom: 'Alexis', nom: 'Moreau', poste: 'defenseur_central', naissance: '2001-12-29' },
  { prenom: 'Étienne', nom: 'Limbolo', poste: 'defenseur_central', naissance: '2003-05-05' },
  { prenom: 'Massyl', nom: 'Ait Hamouche', poste: 'lateral_gauche', naissance: '2005-12-12' },
  { prenom: 'Enzo', nom: 'Vanti', poste: 'lateral_gauche', naissance: '2001-02-17' },
  { prenom: 'Mamadou Lamine', nom: 'Keïta', poste: 'lateral_droit', naissance: '1997-07-01' },
  { prenom: 'Jordy', nom: 'Mulasa Mukata', poste: 'lateral_droit', naissance: '1999-11-06' },
  { prenom: 'Sema', nom: 'Niakaté', poste: 'lateral_droit', naissance: '2003-09-20' },
  { prenom: 'Didier', nom: 'Simane', poste: 'milieu_defensif', naissance: '1996-08-03' },
  { prenom: 'Othman', nom: 'Stitou', poste: 'milieu_central', naissance: '2000-07-20' },
  { prenom: 'Louis', nom: 'Brion', poste: 'milieu_central', naissance: '2002-04-25' },
  { prenom: 'Zakaria', nom: 'Achag', poste: 'milieu_central', naissance: '2000-08-03' },
  { prenom: 'Kensy', nom: 'Gemon', poste: 'milieu_central', naissance: '1998-10-06' },
  { prenom: 'Mohamed Aissa', nom: 'Djellouli', poste: 'milieu_central', naissance: '2003-01-27' },
  { prenom: 'Sid-Ahmed', nom: 'Bouziane', poste: 'milieu_offensif', naissance: '1983-07-18' },
  { prenom: 'Kelly', nom: 'Pakombe Likeli', poste: 'ailier_gauche', naissance: '2000-01-20' },
  { prenom: 'Tymoté', nom: 'Houngbadji', poste: 'ailier_gauche', naissance: '2006-11-17' },
  { prenom: 'Yassine', nom: 'Kharrat', poste: 'ailier_gauche', naissance: '2007-06-18' },
  { prenom: 'Gabriel', nom: 'do Carmo', poste: 'attaquant', naissance: '2001-03-25' },
  { prenom: 'Dayatoule', nom: 'Mendes', poste: 'attaquant', naissance: '1994-07-19' },
  { prenom: 'Mehdi', nom: 'Fahim', poste: 'attaquant', naissance: '1996-07-11' },
  { prenom: 'Gora', nom: 'Gueye', poste: 'attaquant', naissance: '1989-07-28' },
  { prenom: 'Yassine', nom: 'Djabba', poste: 'attaquant', naissance: '2005-02-06' },
  { prenom: 'Antoine', nom: 'Horbatiuk', poste: 'attaquant', naissance: '2003-09-13' },
  { prenom: 'Wanis', nom: 'Larhrissi', poste: 'attaquant', naissance: '2006-05-17' },
  { prenom: 'Hadietou', nom: 'Dramé', poste: 'attaquant', naissance: '1999-03-15' },
  { prenom: 'Lucas', nom: 'Moreira', poste: 'attaquant', naissance: '2008-04-23' },
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
