// Ajoute les joueurs manquants de l'effectif FC Saint-Lô Manche (National 2,
// saison 2026-2027) fourni par l'utilisateur (capture d'écran type
// transfermarkt). Reproduit le chemin "ajout manuel/scouté" de
// footlight-recherche.html (email synthétique @scoute.footlight.fr, profil
// non public, badge déclaratif) — pas de compte auth créé.
//
// club = "FC St-Lô Manche" (abrégé "St", pas "Saint") : calendrier_officiel
// stocke "Fc St Lo Manche 1" (vérifié via diagnostic-club-saint-lo.js), soit
// les mots {st, lo, manche} une fois le mot générique "fc" et le numéro
// final retirés. "FC Saint-Lô Manche" donnerait {saint, lo, manche} — un
// autre jeu de 3 mots qui ne correspond pas mot à mot ("saint" ≠ "st"),
// cassant le rapprochement via clubWordsMatch
// (generer-calendriers-existants.js) qui exige l'égalité stricte à taille
// égale. "St" est donc utilisé, comme pour Biesheim/St Maur précédemment.
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

const CLUB = 'FC St-Lô Manche';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF FC SAINT-LÔ MANCHE", 26/27).
const EFFECTIF = [
  { prenom: 'Oscar', nom: 'Lecanu', poste: 'gardien', naissance: '2002-11-30' },
  { prenom: 'Xavier', nom: 'Gallien', poste: 'gardien', naissance: '1996-08-30' },
  { prenom: 'Hugo', nom: 'Davoust', poste: 'gardien', naissance: '2000-01-11' },
  { prenom: 'Florian', nom: 'Bresteau', poste: 'defenseur_central', naissance: '1994-09-26' },
  { prenom: 'Johann', nom: 'Cangini', poste: 'defenseur_central', naissance: '1999-10-19' },
  { prenom: 'Tom', nom: 'Coyac', poste: 'defenseur_central', naissance: '2005-08-03' },
  { prenom: 'Matthieu', nom: 'Desheulles', poste: 'lateral_gauche', naissance: '2001-09-11' },
  { prenom: 'Paul', nom: 'Leherpeur', poste: 'lateral_droit', naissance: '2001-02-19' },
  { prenom: 'Maxence', nom: 'Guerreiro', poste: 'milieu_defensif', naissance: '1996-02-25' },
  { prenom: 'William', nom: 'Coulibaly', poste: 'milieu_defensif', naissance: '1986-05-03' },
  { prenom: 'Joël', nom: 'Lembo', poste: 'milieu_defensif', naissance: '1993-09-20' },
  { prenom: 'Franck', nom: 'Mefouma', poste: 'milieu_defensif', naissance: '2005-02-24' },
  { prenom: 'Simon', nom: 'Delafosse', poste: 'milieu_central', naissance: '2003-05-08' },
  { prenom: 'Sacha', nom: 'Perrotte', poste: 'milieu_central', naissance: '2002-09-22' },
  { prenom: 'Evann', nom: 'Lecourt', poste: 'milieu_central', naissance: '2006-09-14' },
  { prenom: 'Jules', nom: 'Alexandre', poste: 'milieu_central', naissance: '2005-03-30' },
  { prenom: 'Kellian', nom: 'Mondia', poste: 'milieu_offensif', naissance: '2007-03-01' },
  { prenom: 'Tony', nom: 'Lambard', poste: 'attaquant', naissance: '1992-09-26' },
  { prenom: 'Ryann', nom: 'Belaïb Lemoyne', poste: 'attaquant', naissance: '2004-07-25' },
  { prenom: 'Herman', nom: 'Lemaître', poste: 'attaquant', naissance: '2001-09-04' },
  { prenom: 'Marvyn', nom: 'Perrotte', poste: 'attaquant', naissance: '2005-09-24' },
  { prenom: 'Maxence', nom: 'Danguy', poste: 'attaquant', naissance: '2001-03-30' },
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
