// Ajoute les joueurs manquants de l'effectif Le Puy-en-Velay FC (Ligue 3,
// saison 2026-2027) fourni par l'utilisateur (capture d'écran type
// transfermarkt). Même chemin que les scripts précédents (Bastia,
// Versailles, Caen, Amiens, Valenciennes, Orléans, Fleury, Villefranche,
// Concarneau, Paris 13 Atletico).
//
// Anti-doublon : ignore tout joueur dont le nom (accents/casse ignorés)
// existe déjà n'importe où en base. Lecture paginée (la base dépasse
// 1000 joueurs, plafond par défaut d'une requête PostgREST sans
// pagination — voir ajouter-effectif-paris13.js).
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const CLUB = 'Le Puy-en-Velay FC';
const NIVEAU = 'Ligue 3';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF LE PUY-EN-VELAY FC", 26/27).
const EFFECTIF = [
  { prenom: 'Matis', nom: 'Carvalho', poste: 'gardien', naissance: '1999-04-28' },
  { prenom: 'Théo', nom: 'Ramousse', poste: 'gardien', naissance: '2005-02-06' },
  { prenom: 'Mahamadou', nom: 'Dembélé', poste: 'defenseur_central', naissance: '1999-04-10' },
  { prenom: 'Vinicius', nom: 'Gomes', poste: 'defenseur_central', naissance: '1998-04-19' },
  { prenom: 'Thomas', nom: 'Ghalem', poste: 'defenseur_central', naissance: '2003-08-13' },
  { prenom: 'Edson', nom: 'Seidou', poste: 'defenseur_central', naissance: '1991-10-07' },
  { prenom: 'Ismail', nom: 'Cissé', poste: 'defenseur_central', naissance: '2000-08-04' },
  { prenom: 'Wesley', nom: 'Zahibo', poste: 'lateral_gauche', naissance: '2003-02-06' },
  { prenom: 'Anis', nom: 'Fatahine', poste: 'lateral_gauche', naissance: '2005-06-17' },
  { prenom: 'Yazid', nom: 'Aït Moujane', poste: 'lateral_droit', naissance: '2001-01-19' },
  { prenom: 'Emmanuel', nom: 'Kouassi', poste: 'lateral_droit', naissance: '2003-02-23' },
  { prenom: 'Renald', nom: 'Xhemo', poste: 'milieu_defensif', naissance: '1996-07-24' },
  { prenom: 'Raouf', nom: 'Mroivili', poste: 'milieu_central', naissance: '1999-01-14' },
  { prenom: 'Lilian', nom: 'Baret', poste: 'milieu_central', naissance: '2006-05-25' },
  { prenom: 'Antoine', nom: 'Gauthier', poste: 'milieu_offensif', naissance: '2004-07-01' },
  { prenom: 'Ilan', nom: 'Ducourtioux', poste: 'milieu_offensif', naissance: '2007-04-27' },
  { prenom: 'Plamedi', nom: 'Nsingi', poste: 'attaquant', naissance: '2000-12-17' },
  { prenom: 'Michaël', nom: 'Faty', poste: 'attaquant', naissance: '1996-09-11' },
  { prenom: 'Josselin', nom: 'Gromat', poste: 'attaquant', naissance: '1997-09-06' },
  { prenom: 'Florian', nom: 'Boulet', poste: 'attaquant', naissance: '2003-03-29' },
  { prenom: 'Julien', nom: 'Jacquat', poste: 'attaquant', naissance: '1998-09-04' },
  { prenom: 'Marvin', nom: 'Emmanuel', poste: 'attaquant', naissance: '1996-06-20' },
];

function normaliser(str) {
  return (str || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
function slugifier(str) {
  return normaliser(str).replace(/[^a-z0-9]+/g, '');
}

// Pagination manuelle : au-delà de 1000 lignes, PostgREST tronque
// silencieusement la réponse par défaut.
const joueurs = [];
for (let page = 0; ; page++) {
  const { data, error } = await supabase.from('joueurs').select('id, prenom, nom, club').range(page * 1000, page * 1000 + 999);
  if (error) { console.error('Erreur lecture joueurs :', error.message); process.exit(1); }
  joueurs.push(...(data || []));
  if (!data || data.length < 1000) break;
}
console.log(`${joueurs.length} joueur(s) en base.\n`);

let aInserer = 0, ignores = 0;
for (const j of EFFECTIF) {
  const existant = (joueurs || []).find(
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
