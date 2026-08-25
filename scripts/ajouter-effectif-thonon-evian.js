// Ajoute les joueurs manquants de l'effectif Thonon Évian Grand Genève FC
// (National 2, saison 2026-2027) fourni par l'utilisateur (capture d'écran
// type transfermarkt). Reproduit le chemin "ajout manuel/scouté" de
// footlight-recherche.html (email synthétique @scoute.footlight.fr, profil
// non public, badge déclaratif) — pas de compte auth créé.
//
// "Défense" (sans précision) mappé sur defenseur_central. "Milieu"/"Milieu
// droit" (sans précision fine) mappé sur milieu_central. "Avant-centre"
// mappé sur attaquant.
//
// club = CLUB ci-dessous (orthographe exacte de calendrier_officiel,
// division N2, confirmée via diagnostic-club-thonon-evian.js :
// "Thonon Evian Gg Fc 1", 8 matchs dans le calendrier contre 6 pour
// "Thonon Evian Gg Fc" sans suffixe — retenu par cohérence avec les autres
// équipes premières identifiées ce jour).
//
// Anti-doublon : lecture PAGINÉE de la table joueurs (>2900 lignes, au-delà
// de la limite par défaut de 1000 lignes de PostgREST) pour ne manquer
// aucun joueur existant. Deux joueurs de la capture portent une icône de
// prêt (Maé Clavel, Louis Konan) — s'ils sont détectés en base sous un
// autre club, ne PAS modifier leur club sans confirmation explicite de
// l'utilisateur.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const CLUB = 'Thonon Evian Gg Fc 1';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF THONON ÉVIAN GRAND GENÈVE FC", 26/27).
const EFFECTIF = [
  { prenom: 'Melvin', nom: 'Adrien', poste: 'gardien', naissance: '1993-08-30' },
  { prenom: 'Alassane', nom: 'Diouf', poste: 'gardien', naissance: '2004-01-01' },
  { prenom: 'Pape Cheikh', nom: 'Mbaye', poste: 'defenseur_central', naissance: '2004-12-05' },
  { prenom: 'Moulouk', nom: 'Touré', poste: 'defenseur_central', naissance: '2007-08-09' },
  { prenom: 'Maé', nom: 'Clavel', poste: 'lateral_gauche', naissance: '2002-01-23' },
  { prenom: 'Achille', nom: 'Truchot', poste: 'lateral_gauche', naissance: '2004-10-01' },
  { prenom: 'Olivier', nom: 'Lesueur', poste: 'lateral_gauche', naissance: '1997-07-11' },
  { prenom: 'Jafar', nom: 'Demdoum', poste: 'lateral_gauche', naissance: '1999-03-05' },
  { prenom: 'Paul', nom: 'Devarrewaere', poste: 'milieu_defensif', naissance: '1999-02-19' },
  { prenom: 'Kouamé', nom: 'Kacou', poste: 'milieu_central', naissance: '2006-12-12' },
  { prenom: 'Morel', nom: 'Lebe', poste: 'milieu_central', naissance: '2005-10-13' },
  { prenom: 'Mohamed', nom: 'Sanogo', poste: 'milieu_central', naissance: '2004-11-20' },
  { prenom: 'Mohamed', nom: 'Maouche', poste: 'milieu_central', naissance: '1993-01-10' },
  { prenom: 'Johan', nom: 'Branger', poste: 'milieu_central', naissance: '1993-07-05' },
  { prenom: 'Louis', nom: 'Konan', poste: 'attaquant', naissance: '1998-12-25' },
  { prenom: 'Wilfried', nom: 'Misiak', poste: 'attaquant', naissance: '2001-10-06' },
  { prenom: 'Erwann', nom: 'Ekou', poste: 'attaquant', naissance: '2005-12-29' },
  { prenom: 'Odilon', nom: 'Aba', poste: 'attaquant', naissance: '2005-02-08' },
  { prenom: 'Kacou', nom: 'Richmond', poste: 'attaquant', naissance: '2006-12-12' },
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
