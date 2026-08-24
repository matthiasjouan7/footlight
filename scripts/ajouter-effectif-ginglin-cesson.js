// Ajoute les joueurs manquants de l'effectif AS Ginglin Cesson (National 2,
// saison 2026-2027) fourni par l'utilisateur (capture d'écran type
// transfermarkt). Reproduit le chemin "ajout manuel/scouté" de
// footlight-recherche.html (email synthétique @scoute.footlight.fr, profil
// non public, badge déclaratif) — pas de compte auth créé.
//
// club = "AS Ginglin St-Brieuc" (pas "AS Ginglin Cesson") : calendrier_officiel
// stocke "St Brieuc Ginglin As 1" (vérifié via diagnostic-club-ginglin-cesson.js),
// soit les mots {st, brieuc, ginglin} une fois le mot générique "as" et le
// numéro final retirés. Aucune entrée distincte "Cesson" ne correspond à ce
// club N2 dans le calendrier (seule "OC Cesson-Sévigné" existe, un club
// différent près de Rennes) — Ginglin est en réalité un quartier du secteur
// Cesson à Saint-Brieuc, donc le même club. "St" est utilisé (abrégé),
// comme pour Biesheim/St Maur et FC St-Lô Manche précédemment, pour que
// clubWordsMatch (generer-calendriers-existants.js) trouve l'égalité
// stricte à 3 mots.
//
// Anti-doublon : lecture PAGINÉE de la table joueurs (>2700 lignes, au-delà
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

const CLUB = 'AS Ginglin St-Brieuc';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF AS GINGLIN CESSON", 26/27).
const EFFECTIF = [
  { prenom: 'Carl', nom: 'Hinault', poste: 'gardien', naissance: '1991-09-27' },
  { prenom: 'Gabin', nom: 'Le Normand', poste: 'gardien', naissance: '2006-06-26' },
  { prenom: 'Kévin', nom: 'Simon', poste: 'defenseur_central', naissance: '1991-12-04' },
  { prenom: 'Quentin', nom: 'Urvoy', poste: 'defenseur_central', naissance: '1999-07-26' },
  { prenom: 'Kam', nom: 'Tahie', poste: 'defenseur_central', naissance: '2005-12-12' },
  { prenom: 'Antoine', nom: 'Baruxakis', poste: 'defenseur_central', naissance: '1997-01-17' },
  { prenom: 'Laurent', nom: 'Mallet', poste: 'defenseur_central', naissance: '2007-02-08' },
  { prenom: 'Jean-Marie', nom: 'Taillard', poste: 'defenseur_central', naissance: '1994-02-27' },
  { prenom: 'Paul', nom: 'Jehanno', poste: 'lateral_droit', naissance: '2002-09-06' },
  { prenom: 'Jules', nom: 'Rivoal', poste: 'milieu_central', naissance: '2001-05-27' },
  { prenom: 'Dorian', nom: 'Haguet', poste: 'milieu_central', naissance: '1996-08-05' },
  { prenom: 'Gaël', nom: 'Derrien', poste: 'milieu_central', naissance: '2005-02-04' },
  { prenom: 'Norbert', nom: 'Gomis', poste: 'milieu_defensif', naissance: '1994-08-31' },
  { prenom: 'Nathanaël', nom: 'Marie-Rose', poste: 'milieu_central', naissance: '2001-08-31' },
  { prenom: 'Loïck', nom: 'Nguema', poste: 'milieu_central', naissance: '1996-07-16' },
  { prenom: 'Samba', nom: 'Diarra', poste: 'milieu_central', naissance: '1994-12-30' },
  { prenom: 'Pindi', nom: 'Soba', poste: 'milieu_central', naissance: '2000-04-22' },
  { prenom: 'Dana', nom: 'Allée', poste: 'milieu_central', naissance: '2001-10-09' },
  { prenom: 'Mickaël', nom: 'Le Berre', poste: 'milieu_central', naissance: '1994-08-18' },
  { prenom: 'Yonathan', nom: 'Blin', poste: 'milieu_offensif', naissance: '2002-01-18' },
  { prenom: 'Aurélien', nom: 'Joulain', poste: 'ailier_gauche', naissance: '1990-09-30' },
  { prenom: 'Ayman', nom: 'Attoumani', poste: 'ailier_droit', naissance: '2008-09-06' },
  { prenom: 'Henri', nom: 'Badoual', poste: 'attaquant', naissance: '2004-11-18' },
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
