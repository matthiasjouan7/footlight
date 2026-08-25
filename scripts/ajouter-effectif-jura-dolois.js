// Ajoute les joueurs manquants de l'effectif Jura Dolois Football
// (National 2, saison 2026-2027) fourni par l'utilisateur (capture d'écran
// type transfermarkt). Reproduit le chemin "ajout manuel/scouté" de
// footlight-recherche.html (email synthétique @scoute.footlight.fr, profil
// non public, badge déclaratif) — pas de compte auth créé.
//
// "Milieu"/"Milieu droit" (sans précision fine) mappé sur milieu_central.
// "Avant-centre" mappé sur attaquant.
//
// club = CLUB ci-dessous (orthographe exacte de calendrier_officiel,
// division N2, confirmée via diagnostic-club-jura-dolois.js : "Jura Dolois
// Football 1").
//
// Anti-doublon : lecture PAGINÉE de la table joueurs (>2900 lignes, au-delà
// de la limite par défaut de 1000 lignes de PostgREST) pour ne manquer
// aucun joueur existant. Plusieurs joueurs de la capture portent une icône
// de prêt (Kein Matukondolo, Assad Maoulida, Vivian Galland, Yohann
// Elbachir, Théo Godard, Vilouka Nkoka, Mehdi Boudiba, Nazim Mekhnen) —
// s'ils sont détectés en base sous un autre club, ne PAS modifier leur club
// sans confirmation explicite de l'utilisateur.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const CLUB = 'Jura Dolois Football 1';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF JURA DOLOIS FOOTBALL", 26/27).
const EFFECTIF = [
  { prenom: 'Papa Demba', nom: 'Camara', poste: 'gardien', naissance: '1993-01-16' },
  { prenom: 'Axel', nom: 'Van Assche', poste: 'gardien', naissance: '2001-10-28' },
  { prenom: 'Kein', nom: 'Matukondolo', poste: 'defenseur_central', naissance: '1994-10-18' },
  { prenom: 'Bilal', nom: 'Er Rafif', poste: 'defenseur_central', naissance: '2004-04-18' },
  { prenom: 'Assad', nom: 'Maoulida', poste: 'defenseur_central', naissance: '2003-04-09' },
  { prenom: 'Vivian', nom: 'Galland', poste: 'lateral_gauche', naissance: '1999-05-10' },
  { prenom: 'Ramy', nom: 'El Katch', poste: 'lateral_droit', naissance: '1996-11-19' },
  { prenom: 'Yohann', nom: 'Elbachir', poste: 'milieu_central', naissance: '2000-03-20' },
  { prenom: 'Younes', nom: 'Oubrik', poste: 'milieu_central', naissance: '2006-03-20' },
  { prenom: 'Abdourahim', nom: 'Moina', poste: 'milieu_central', naissance: '2000-12-17' },
  { prenom: 'Théo', nom: 'Godard', poste: 'milieu_central', naissance: '2001-05-21' },
  { prenom: 'Zachary', nom: 'Marques', poste: 'milieu_central', naissance: '2001-12-28' },
  { prenom: 'Charly', nom: 'Kouhon', poste: 'ailier_droit', naissance: '1997-01-03' },
  { prenom: 'Vilouka', nom: 'Nkoka', poste: 'ailier_droit', naissance: '2003-03-19' },
  { prenom: 'Mehdi', nom: 'Boudiba', poste: 'attaquant', naissance: '1994-06-02' },
  { prenom: 'Nazim', nom: 'Mekhnen', poste: 'attaquant', naissance: '2004-09-22' },
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
