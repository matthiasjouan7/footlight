// Ajoute les joueurs manquants de l'effectif SC Aubagne Air Bel (Ligue 3,
// saison 2026-2027) fourni par l'utilisateur (capture d'écran type
// transfermarkt). Même chemin que les scripts précédents (Bastia,
// Versailles, Caen, Amiens, Valenciennes, Orléans, Fleury, Villefranche,
// Concarneau, Paris 13 Atletico, Le Puy-en-Velay, Cannes).
//
// Anti-doublon : ignore tout joueur dont le nom (accents/casse ignorés)
// existe déjà n'importe où en base. Lecture paginée (la base dépasse
// 1000 joueurs, plafond par défaut d'une requête PostgREST sans
// pagination).
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const CLUB = 'SC Aubagne Air Bel';
const NIVEAU = 'Ligue 3';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF SC AUBAGNE AIR BEL", 26/27).
const EFFECTIF = [
  { prenom: 'Jordan', nom: 'Gil', poste: 'gardien', naissance: '1996-11-01' },
  { prenom: 'Tiago', nom: 'Moreira', poste: 'gardien', naissance: '2005-07-14' },
  { prenom: 'Issiaka', nom: 'Touré', poste: 'gardien', naissance: '2004-11-07' },
  { prenom: 'Rayane', nom: 'Doucouré', poste: 'defenseur_central', naissance: '2001-03-30' },
  { prenom: 'Mohamed', nom: 'Nehari', poste: 'defenseur_central', naissance: '1992-10-08' },
  { prenom: 'Ritchy', nom: 'Valmé', poste: 'defenseur_central', naissance: '2005-02-03' },
  { prenom: 'Moustakim', nom: 'Assoumani', poste: 'defenseur_central', naissance: '2000-01-12' },
  { prenom: 'Anisse', nom: 'Bellebrahim', poste: 'lateral_gauche', naissance: '2002-01-15' },
  { prenom: 'Aymen', nom: 'Sadi', poste: 'lateral_droit', naissance: '2006-04-10' },
  { prenom: 'Brahima', nom: 'Doukansy', poste: 'milieu_defensif', naissance: '1999-08-21' },
  { prenom: 'Adem', nom: 'Tafni', poste: 'milieu_defensif', naissance: '2004-05-13' },
  { prenom: 'Nohan', nom: 'Parmentier', poste: 'milieu_defensif', naissance: '2009-06-16' },
  { prenom: 'Soiyir', nom: 'Ahamada', poste: 'milieu_central', naissance: '2007-05-24' },
  { prenom: 'Jebryl', nom: 'Sahraoui', poste: 'milieu_central', naissance: '2005-02-04' },
  { prenom: 'Adam', nom: 'Oudjani', poste: 'milieu_offensif', naissance: '2001-08-29' },
  { prenom: 'Karim', nom: 'Cissé', poste: 'milieu_offensif', naissance: '2004-11-14' },
  { prenom: 'Malik', nom: 'Ahamadi', poste: 'milieu_offensif', naissance: '2008-11-17' },
  { prenom: 'Bilel', nom: 'Tafni', poste: 'ailier_gauche', naissance: '2004-05-13' },
  { prenom: 'Bilal', nom: 'Benosmane', poste: 'ailier_gauche', naissance: '2001-04-09' },
  { prenom: 'Walid', nom: 'Bouaziz', poste: 'ailier_droit', naissance: '2004-12-19' },
  { prenom: 'Adame', nom: 'Faïz', poste: 'ailier_droit', naissance: '2005-06-10' },
  { prenom: 'Yohan', nom: 'Zemoura', poste: 'attaquant', naissance: '2001-05-31' },
  { prenom: 'Sabri', nom: 'Hattab', poste: 'attaquant', naissance: '1996-03-08' },
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
