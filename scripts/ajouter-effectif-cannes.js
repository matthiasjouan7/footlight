// Ajoute les joueurs manquants de l'effectif AS Cannes (Ligue 3, saison
// 2026-2027) fourni par l'utilisateur (capture d'écran type
// transfermarkt). Même chemin que les scripts précédents (Bastia,
// Versailles, Caen, Amiens, Valenciennes, Orléans, Fleury, Villefranche,
// Concarneau, Paris 13 Atletico, Le Puy-en-Velay).
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

const CLUB = 'AS Cannes';
const NIVEAU = 'Ligue 3';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF AS CANNES", 26/27).
const EFFECTIF = [
  { prenom: 'Quentin', nom: 'Beunardeau', poste: 'gardien', naissance: '1994-02-27' },
  { prenom: 'Fabio', nom: 'Vanni', poste: 'gardien', naissance: '2002-07-20' },
  { prenom: 'Léandro', nom: 'Morante', poste: 'defenseur_central', naissance: '1997-04-18' },
  { prenom: 'Loup-Diwan', nom: 'Gueho', poste: 'defenseur_central', naissance: '2004-05-24' },
  { prenom: 'Jonas', nom: 'Smith', poste: 'defenseur_central', naissance: '1999-10-09' },
  { prenom: 'Grégoire', nom: 'Pineau', poste: 'defenseur_central', naissance: '1999-05-27' },
  { prenom: 'Cédric', nom: 'Makutungu', poste: 'lateral_gauche', naissance: '1997-10-03' },
  { prenom: 'Houssen', nom: 'Abderrahmane', poste: 'lateral_gauche', naissance: '1995-02-03' },
  { prenom: 'Yanis', nom: 'Hadjem', poste: 'lateral_droit', naissance: '2001-05-17' },
  { prenom: 'Sébastien', nom: 'Corchia', poste: 'lateral_droit', naissance: '1990-11-01' },
  { prenom: 'Cédric', nom: 'Gonçalves', poste: 'milieu_defensif', naissance: '1993-08-06' },
  { prenom: 'Enzo', nom: 'Caumont', poste: 'milieu_defensif', naissance: '2004-03-13' },
  { prenom: 'Loup', nom: 'Hervieu', poste: 'milieu_central', naissance: '2000-04-05' },
  { prenom: 'Maxime', nom: 'Blanc', poste: 'milieu_central', naissance: '1992-01-23' },
  { prenom: 'Cheikh', nom: "N'Doye", poste: 'milieu_central', naissance: '1986-03-29' },
  { prenom: 'Ahmed', nom: 'Majid', poste: 'milieu_central', naissance: '2002-03-28' },
  { prenom: 'Almike', nom: "N'Diaye", poste: 'milieu_central', naissance: '1996-10-26' },
  { prenom: 'Julien', nom: 'Lopez', poste: 'ailier_gauche', naissance: '1992-03-01' },
  { prenom: 'Alan', nom: 'Kerouedan', poste: 'ailier_droit', naissance: '2000-01-12' },
  { prenom: 'Malhory', nom: 'Noc', poste: 'ailier_droit', naissance: '1998-01-09' },
  { prenom: 'Brice', nom: 'Oggad', poste: 'ailier_droit', naissance: '1997-05-22' },
  { prenom: 'Raphaël', nom: 'Gerbeaud', poste: 'attaquant', naissance: '2000-08-04' },
  { prenom: 'George', nom: 'Morgan', poste: 'attaquant', naissance: '2006-09-08' },
  { prenom: 'Samuel', nom: 'Dié', poste: 'attaquant', naissance: '2006-01-17' },
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
