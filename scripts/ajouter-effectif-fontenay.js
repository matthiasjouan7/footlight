// Ajoute les joueurs manquants de l'effectif Vendée Fontenay Foot
// (National 2, saison 2026-2027) fourni par l'utilisateur (capture d'écran
// type transfermarkt). Reproduit le chemin "ajout manuel/scouté" de
// footlight-recherche.html (email synthétique @scoute.footlight.fr, profil
// non public, badge déclaratif) — pas de compte auth créé.
//
// club = "Vendée Fontenay Foot" (direct) : calendrier_officiel stocke
// "Fontenay Vendee 1" (vérifié via diagnostic-club-fontenay.js), soit les
// mots {fontenay, vendee} une fois le numéro final retiré — inclus dans les
// mots {vendee, fontenay, foot} de "Vendée Fontenay Foot" (aucun mot
// générique retiré, "foot" n'étant pas dans la liste des mots génériques,
// seul "football" l'est), donc rapprochement correct via clubWordsMatch
// (generer-calendriers-existants.js).
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

const CLUB = 'Vendée Fontenay Foot';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF VENDÉE FONTENAY FOOT", 26/27).
const EFFECTIF = [
  { prenom: 'Brian', nom: 'Picart', poste: 'gardien', naissance: '1997-10-18' },
  { prenom: 'Noah', nom: 'Renou', poste: 'gardien', naissance: '2003-10-28' },
  { prenom: 'Thomas', nom: 'Brémond', poste: 'defenseur_central', naissance: '2000-05-23' },
  { prenom: 'Yanis', nom: 'Leriche', poste: 'defenseur_central', naissance: '2001-06-11' },
  { prenom: 'Kerian', nom: 'Ernault', poste: 'defenseur_central', naissance: '2004-10-22' },
  { prenom: 'Antonin', nom: 'Moisdon', poste: 'defenseur_central', naissance: '2005-04-25' },
  { prenom: 'Nathan', nom: 'Fromaget', poste: 'lateral_droit', naissance: '2002-09-16' },
  { prenom: 'Heavenbridge', nom: 'Bassala', poste: 'lateral_droit', naissance: '2002-01-12' },
  { prenom: 'David', nom: 'Vinet', poste: 'milieu_defensif', naissance: '1991-05-14' },
  { prenom: 'Mehdi', nom: 'Belbachir', poste: 'milieu_central', naissance: '1992-01-21' },
  { prenom: 'Thibaud', nom: 'Calavia', poste: 'milieu_central', naissance: '2003-04-03' },
  { prenom: 'Kéo', nom: 'Balliau', poste: 'milieu_central', naissance: '1997-07-02' },
  { prenom: 'Lenny', nom: 'Girard', poste: 'milieu_offensif', naissance: '2003-06-01' },
  { prenom: 'Silly', nom: 'Sangharé', poste: 'ailier_gauche', naissance: '2001-02-24' },
  { prenom: 'Ahmed', nom: 'Chaibi', poste: 'ailier_gauche', naissance: '2001-08-20' },
  { prenom: 'Joey', nom: 'Millimono', poste: 'attaquant', naissance: '1995-05-27' },
  { prenom: 'Stany', nom: 'Epagna', poste: 'attaquant', naissance: '1995-06-07' },
  { prenom: 'Fodé', nom: 'Diawara', poste: 'attaquant', naissance: '2000-01-10' },
  { prenom: 'Enzo', nom: 'Renou', poste: 'attaquant', naissance: '2001-08-20' },
  { prenom: 'Djamyl', nom: 'Vidot', poste: 'attaquant', naissance: '2007-09-20' },
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
