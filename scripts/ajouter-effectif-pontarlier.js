// Ajoute les joueurs manquants de l'effectif CA Pontarlier (National 2,
// saison 2026-2027) fourni par l'utilisateur (capture d'écran type
// transfermarkt). Reproduit le chemin "ajout manuel/scouté" de
// footlight-recherche.html (email synthétique @scoute.footlight.fr, profil
// non public, badge déclaratif) — pas de compte auth créé.
//
// "Défense" et "Milieu" (sans précision) mappés respectivement sur
// defenseur_central et milieu_central. "Avant-centre" mappé sur attaquant.
//
// club = CLUB ci-dessous (orthographe exacte de calendrier_officiel,
// division N2, à confirmer via diagnostic-club-pontarlier.js).
//
// Anti-doublon : lecture PAGINÉE de la table joueurs (>2900 lignes, au-delà
// de la limite par défaut de 1000 lignes de PostgREST) pour ne manquer
// aucun joueur existant. Jordan Renaudin porte une icône de prêt sur la
// capture — s'il est détecté en base sous un autre club, ne PAS modifier
// son club sans confirmation explicite de l'utilisateur.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const CLUB = 'Pontarlier Ca 1';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF CA PONTARLIER", 26/27).
const EFFECTIF = [
  { prenom: 'Lucas', nom: 'Buisson', poste: 'gardien', naissance: '1996-03-12' },
  { prenom: 'Noé Reymond', nom: 'Forkani', poste: 'gardien', naissance: '1999-02-27' },
  { prenom: 'Xavier', nom: 'Marques da Rocha', poste: 'defenseur_central', naissance: '1995-01-01' },
  { prenom: 'Emilien', nom: 'Monney', poste: 'defenseur_central', naissance: '2001-09-25' },
  { prenom: 'Valentin', nom: 'Revoy', poste: 'defenseur_central', naissance: '1992-07-06' },
  { prenom: 'Valentin', nom: 'Helfer-Lebert', poste: 'lateral_gauche', naissance: '1999-04-18' },
  { prenom: 'Jérémie', nom: 'Courtet', poste: 'lateral_gauche', naissance: '1993-05-19' },
  { prenom: 'Reda', nom: 'Tahar', poste: 'milieu_defensif', naissance: '2001-09-30' },
  { prenom: 'Thomas', nom: 'Rota', poste: 'milieu_central', naissance: '2001-10-01' },
  { prenom: 'Maxime', nom: 'Bonnet', poste: 'milieu_central', naissance: '1997-06-05' },
  { prenom: 'Gabin', nom: 'Courtet', poste: 'milieu_central', naissance: '2005-03-19' },
  { prenom: 'Lucas', nom: 'Jeannin', poste: 'milieu_central', naissance: '2006-06-20' },
  { prenom: 'Mamadou-Lamine', nom: 'Camara', poste: 'milieu_central', naissance: '1997-11-23' },
  { prenom: 'Mathieu', nom: 'Duféal', poste: 'milieu_offensif', naissance: '1990-05-15' },
  { prenom: 'Jordan', nom: 'Renaudin', poste: 'ailier_gauche', naissance: '2001-01-27' },
  { prenom: 'Quentin', nom: 'Deniaud', poste: 'ailier_droit', naissance: '1998-10-08' },
  { prenom: 'Julien', nom: 'Chapit', poste: 'attaquant', naissance: '1994-08-29' },
  { prenom: 'Hugo', nom: 'Vegran', poste: 'attaquant', naissance: '2006-03-18' },
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
