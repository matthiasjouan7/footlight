// Ajoute les joueurs manquants de l'effectif SC Bastia B (National 2,
// saison 2026-2027) fourni par l'utilisateur (capture d'écran type
// transfermarkt). Reproduit le chemin "ajout manuel/scouté" de
// footlight-recherche.html (email synthétique @scoute.footlight.fr, profil
// non public, badge déclaratif) — pas de compte auth créé.
//
// club = "SC Bastia 2" (orthographe exacte de calendrier_officiel, division
// N2, groupe D : "Sc Bastia 2" — même convention que Rodez AF 2, Le Mans
// FC 2, etc. — l'un des clubs du groupe D sans effectif enregistré,
// identifié via diagnostic-effectifs-manquants-n2.js).
//
// Anti-doublon : lecture PAGINÉE de la table joueurs (>2900 lignes, au-delà
// de la limite par défaut de 1000 lignes de PostgREST) pour ne manquer
// aucun joueur existant.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const CLUB = 'SC Bastia 2';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF SC BASTIA B", 26/27).
const EFFECTIF = [
  { prenom: 'Florian', nom: 'Baccarelli', poste: 'gardien', naissance: '1992-02-28' },
  { prenom: 'Melvin', nom: 'Hernández', poste: 'gardien', naissance: '2008-01-30' },
  { prenom: 'Cheik', nom: 'Fofana', poste: 'gardien', naissance: '2007-03-01' },
  { prenom: 'Nicolas', nom: 'Aiello', poste: 'defenseur_central', naissance: '2005-04-28' },
  { prenom: 'Anthony', nom: 'Gonzalez', poste: 'defenseur_central', naissance: '2005-05-02' },
  { prenom: 'David', nom: 'Djédjé', poste: 'defenseur_central', naissance: '2007-01-30' },
  { prenom: 'Mathéo', nom: 'Moussa', poste: 'defenseur_central', naissance: '2005-11-14' },
  { prenom: 'Yoan', nom: 'Akwa', poste: 'defenseur_central', naissance: '2007-04-01' },
  { prenom: 'Jean', nom: 'Koffi', poste: 'defenseur_central', naissance: '2005-01-08' },
  { prenom: 'Nassim', nom: 'Douce Boumaza', poste: 'defenseur_central', naissance: '2007-02-12' },
  { prenom: 'Yahya', nom: 'Bathily', poste: 'milieu_defensif', naissance: '2003-06-08' },
  { prenom: 'Harry', nom: 'Moore', poste: 'milieu_central', naissance: '2007-04-28' },
  { prenom: 'Adrien', nom: 'Seatelli', poste: 'milieu_central', naissance: '2007-08-09' },
  { prenom: 'Issa', nom: 'Medini', poste: 'milieu_central', naissance: '2007-04-10' },
  { prenom: 'Nolhann', nom: 'Alebate', poste: 'ailier_gauche', naissance: '2006-07-10' },
  { prenom: 'Daniel', nom: 'Akinleye', poste: 'ailier_droit', naissance: '2006-08-20' },
  { prenom: 'Gordon', nom: 'Pasqualini', poste: 'attaquant', naissance: '2004-06-01' },
  { prenom: 'Abdoul Jalil', nom: 'Tinguiano', poste: 'attaquant', naissance: '2006-06-14' },
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
  console.log(`${j.prenom} ${j.nom} : à créer (${j.poste}, ${CLUB}, né(e) ${j.naissance}).`);
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
