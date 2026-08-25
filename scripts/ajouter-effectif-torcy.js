// Ajoute les joueurs manquants de l'effectif US Torcy (National 2, saison
// 2026-2027) fourni par l'utilisateur (capture d'écran type transfermarkt).
// Reproduit le chemin "ajout manuel/scouté" de footlight-recherche.html
// (email synthétique @scoute.footlight.fr, profil non public, badge
// déclaratif) — pas de compte auth créé.
//
// "Milieu" (sans précision) et "Milieu central" mappés sur milieu_central.
// "Défense" (sans précision) mappé sur defenseur_central. "Avant-centre"
// mappé sur attaquant.
//
// club = CLUB ci-dessous (orthographe exacte de calendrier_officiel,
// division N2, à confirmer via diagnostic-club-torcy.js — l'un des clubs
// du groupe E sans effectif enregistré).
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

const CLUB = 'Us Torcy Pvm 1';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF US TORCY", 26/27).
const EFFECTIF = [
  { prenom: 'Trey', nom: 'Vimalin', poste: 'gardien', naissance: '2001-01-28' },
  { prenom: 'Narcisse Junior', nom: 'Nlend', poste: 'gardien', naissance: '1991-09-10' },
  { prenom: 'Maxime', nom: 'Geloto', poste: 'gardien', naissance: '1996-03-31' },
  { prenom: 'Seydou', nom: 'Traoré', poste: 'defenseur_central', naissance: '2007-01-01' },
  { prenom: 'Benjamin', nom: 'Nahoui', poste: 'defenseur_central', naissance: '2001-07-07' },
  { prenom: 'Ilyas', nom: 'Khairi', poste: 'defenseur_central', naissance: '1995-05-22' },
  { prenom: 'Daba', nom: 'Cissoko', poste: 'defenseur_central', naissance: '2003-01-26' },
  { prenom: 'Fara', nom: 'Mendes', poste: 'defenseur_central', naissance: '2000-12-11' },
  { prenom: 'Marvyn', nom: 'Jean-Lambert', poste: 'defenseur_central', naissance: '1999-11-01' },
  { prenom: 'Alhassane', nom: 'Barry', poste: 'defenseur_central', naissance: '1998-12-31' },
  { prenom: 'Mehdi', nom: 'Tahri', poste: 'defenseur_central', naissance: '2007-10-23' },
  { prenom: 'Kelhyan', nom: 'Chatelus', poste: 'defenseur_central', naissance: '2005-03-18' },
  { prenom: 'Nathan', nom: 'Samuel', poste: 'lateral_gauche', naissance: '2006-12-05' },
  { prenom: 'Moustapha', nom: 'Kouyaté', poste: 'lateral_gauche', naissance: '2001-04-04' },
  { prenom: 'Louca', nom: 'Devidal', poste: 'lateral_droit', naissance: '2001-04-19' },
  { prenom: 'Wassim', nom: 'Mechmache', poste: 'milieu_central', naissance: '2001-02-03' },
  { prenom: 'Aylan', nom: 'Labdoun', poste: 'milieu_defensif', naissance: '2002-07-14' },
  { prenom: 'Warren', nom: 'Mountsangui', poste: 'milieu_defensif', naissance: '2004-03-04' },
  { prenom: 'Younes', nom: 'Mokrane', poste: 'milieu_central', naissance: '1991-02-14' },
  { prenom: 'Khaled', nom: 'Timera', poste: 'milieu_central', naissance: '2002-08-11' },
  { prenom: 'Zigui', nom: 'Sery', poste: 'milieu_central', naissance: '2000-05-17' },
  { prenom: 'Emmanuel', nom: 'Fonkou', poste: 'milieu_defensif', naissance: '2005-08-01' },
  { prenom: 'Salle', nom: 'Magassa', poste: 'milieu_central', naissance: '2007-08-20' },
  { prenom: 'Marouen', nom: 'Sallam', poste: 'milieu_central', naissance: '1992-11-08' },
  { prenom: 'Moussa', nom: 'Traoré', poste: 'milieu_central', naissance: '1998-02-06' },
  { prenom: 'Sofian', nom: 'Bouadla', poste: 'milieu_central', naissance: '2002-05-21' },
  { prenom: 'Youssef', nom: 'Benhamma', poste: 'milieu_offensif', naissance: '2001-02-20' },
  { prenom: 'Hakim', nom: 'Naïm', poste: 'ailier_gauche', naissance: '1995-05-11' },
  { prenom: 'Lény Romain', nom: 'Moura', poste: 'ailier_gauche', naissance: '2006-08-28' },
  { prenom: 'Ali', nom: 'Abed', poste: 'ailier_droit', naissance: '1990-09-24' },
  { prenom: 'Théo', nom: 'Dumoulin', poste: 'attaquant', naissance: '2002-03-08' },
  { prenom: 'Sajed', nom: 'Jebnoun', poste: 'attaquant', naissance: '2003-06-19' },
  { prenom: 'Modibo', nom: 'Keïta', poste: 'attaquant', naissance: '2004-02-18' },
  { prenom: 'Néant', nom: 'Nzambo-Nzingo', poste: 'attaquant', naissance: '1997-10-26' },
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
