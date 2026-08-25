// Ajoute les joueurs manquants de l'effectif ASM Belfort (National 2, saison
// 2026-2027) fourni par l'utilisateur (capture d'écran type transfermarkt).
// Reproduit le chemin "ajout manuel/scouté" de footlight-recherche.html
// (email synthétique @scoute.footlight.fr, profil non public, badge
// déclaratif) — pas de compte auth créé.
//
// "Défense" (sans précision) mappé sur defenseur_central, "Milieu" (sans
// précision) et "Milieu droit" sur milieu_central, comme pour les effectifs
// précédents.
//
// club = "Belfortaine Asm Fc 1" (orthographe exacte de calendrier_officiel,
// division N2, confirmée via diagnostic-club-belfort.js — l'un des clubs du
// groupe E sans effectif enregistré).
//
// Anti-doublon : lecture PAGINÉE de la table joueurs (>2900 lignes, au-delà
// de la limite par défaut de 1000 lignes de PostgREST) pour ne manquer
// aucun joueur existant. Plusieurs joueurs de la capture portent une icône
// de prêt (Stanley Ismaël, Yanis Achour, Alexandre Vincent, Miguel Ribeiro
// Castro) — s'ils sont détectés en base sous un autre club, ne PAS modifier
// leur club sans confirmation explicite de l'utilisateur.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const CLUB = 'Belfortaine Asm Fc 1';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF ASM BELFORT", 26/27).
const EFFECTIF = [
  { prenom: 'Kaïs', nom: 'André', poste: 'gardien', naissance: '2005-11-07' },
  { prenom: 'Stanley', nom: 'Ismaël', poste: 'gardien', naissance: '2004-10-03' },
  { prenom: 'Lylian', nom: 'Gerber', poste: 'defenseur_central', naissance: '2003-10-05' },
  { prenom: 'Marlon', nom: 'Burgy', poste: 'defenseur_central', naissance: '2006-10-05' },
  { prenom: 'Anthony', nom: 'Teixeira', poste: 'defenseur_central', naissance: '1999-10-02' },
  { prenom: 'Sala', nom: 'Sidibé', poste: 'defenseur_central', naissance: '1999-11-27' },
  { prenom: 'Louis', nom: 'Nganioni', poste: 'lateral_gauche', naissance: '1995-06-03' },
  { prenom: 'Jaffray', nom: 'Nsimba', poste: 'lateral_droit', naissance: '1991-01-11' },
  { prenom: 'Yanis', nom: 'Achour', poste: 'lateral_droit', naissance: '1999-04-24' },
  { prenom: 'Naël', nom: 'Bouledjouidja', poste: 'milieu_central', naissance: '2007-11-09' },
  { prenom: 'Paul', nom: 'Muller', poste: 'milieu_central', naissance: '2004-04-16' },
  { prenom: 'Alexandre', nom: 'Vincent', poste: 'milieu_offensif', naissance: '1994-04-25' },
  { prenom: 'Tangui', nom: 'Le Menn', poste: 'milieu_offensif', naissance: '1999-06-28' },
  { prenom: 'Adrien', nom: 'Delphis', poste: 'milieu_offensif', naissance: '2003-06-17' },
  { prenom: 'Max', nom: 'Demougeot', poste: 'milieu_offensif', naissance: '1999-10-23' },
  { prenom: 'Miguel', nom: 'Ribeiro Castro', poste: 'milieu_offensif', naissance: '2000-05-13' },
  { prenom: 'Anas', nom: 'Bouchyoua', poste: 'milieu_offensif', naissance: '2007-06-22' },
  { prenom: 'Ambroise', nom: 'Gboho', poste: 'attaquant', naissance: '1994-08-06' },
  { prenom: 'Corentin', nom: 'Ribeiro', poste: 'attaquant', naissance: '2004-12-04' },
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
