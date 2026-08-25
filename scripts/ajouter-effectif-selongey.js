// Ajoute les joueurs manquants de l'effectif IS-Selongey Football (National
// 2, saison 2026-2027) fourni par l'utilisateur (capture d'écran type
// transfermarkt). Reproduit le chemin "ajout manuel/scouté" de
// footlight-recherche.html (email synthétique @scoute.footlight.fr, profil
// non public, badge déclaratif) — pas de compte auth créé.
//
// "Milieu" (sans précision) mappé sur milieu_central.
//
// club = CLUB ci-dessous (orthographe exacte de calendrier_officiel,
// division N2, à confirmer via diagnostic-club-selongey.js).
//
// Anti-doublon : lecture PAGINÉE de la table joueurs (>2900 lignes, au-delà
// de la limite par défaut de 1000 lignes de PostgREST) pour ne manquer
// aucun joueur existant. Sébastien Agüero porte une icône de prêt sur la
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

const CLUB = 'Is-Selongey 1';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF IS-SELONGEY FOOTBALL", 26/27).
const EFFECTIF = [
  { prenom: 'Enzo', nom: 'Breviglieri', poste: 'gardien', naissance: '2003-01-29' },
  { prenom: 'Ugo', nom: 'Bandelier', poste: 'gardien', naissance: '2004-06-28' },
  { prenom: 'Romain', nom: 'Teste', poste: 'gardien', naissance: '1999-08-10' },
  { prenom: 'Axel', nom: 'Mary', poste: 'defenseur_central', naissance: '2001-11-08' },
  { prenom: 'Mathieu', nom: 'Kaputu', poste: 'defenseur_central', naissance: '2005-07-02' },
  { prenom: 'Vincent', nom: 'Appert', poste: 'defenseur_central', naissance: '2001-01-03' },
  { prenom: 'Sébastien', nom: 'Agüero', poste: 'lateral_droit', naissance: '1993-08-17' },
  { prenom: 'Théo', nom: 'Miclet', poste: 'lateral_droit', naissance: '2001-03-27' },
  { prenom: 'Evan', nom: 'Garnier', poste: 'lateral_droit', naissance: '2006-09-20' },
  { prenom: 'Anthony', nom: 'Pitois', poste: 'milieu_central', naissance: '1998-10-21' },
  { prenom: 'Romain', nom: 'Gagnant', poste: 'milieu_central', naissance: '2000-07-25' },
  { prenom: 'Lois', nom: 'Hugot', poste: 'milieu_central', naissance: '2005-02-25' },
  { prenom: 'Maël', nom: 'Bornot', poste: 'milieu_central', naissance: '2005-01-24' },
  { prenom: 'Lenny', nom: 'Beauséjour', poste: 'milieu_central', naissance: '2004-07-29' },
  { prenom: 'Clément', nom: 'Lauper', poste: 'milieu_central', naissance: '2004-11-02' },
  { prenom: 'Hassan', nom: 'Fouad', poste: 'milieu_offensif', naissance: '2005-08-13' },
  { prenom: 'Sejdi', nom: 'Blakqori', poste: 'attaquant', naissance: '2004-11-17' },
  { prenom: 'Yassir', nom: 'Hammi', poste: 'attaquant', naissance: '2004-02-16' },
  { prenom: 'Gaspard', nom: 'Grosjean', poste: 'attaquant', naissance: '2005-05-09' },
  { prenom: 'Bouhjar', nom: 'Zahaf', poste: 'attaquant', naissance: '2004-08-27' },
  { prenom: 'Melvin', nom: 'Wegiel', poste: 'attaquant', naissance: '2002-04-16' },
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
