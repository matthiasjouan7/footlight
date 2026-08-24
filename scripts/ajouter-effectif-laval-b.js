// Ajoute les joueurs manquants de l'effectif Stade Laval B (National 2,
// saison 2026-2027) fourni par l'utilisateur (capture d'écran type
// transfermarkt). Reproduit le chemin "ajout manuel/scouté" de
// footlight-recherche.html (email synthétique @scoute.footlight.fr, profil
// non public, badge déclaratif) — pas de compte auth créé.
//
// club = "Stade Laval" (sans "B") : calendrier_officiel abrège le club en
// "Laval Stade May. Fc" (vérifié via diagnostic-club-laval-b.js), soit les
// mots {laval, may} une fois les mots génériques retirés (stade/fc) — un
// jeu de 2 mots exactement. "Stade Laval B" donnerait {laval, b}, un autre
// jeu de 2 mots qui ne correspond pas mot à mot ("b" ≠ "may"), cassant le
// rapprochement via clubWordsMatch (generer-calendriers-existants.js) qui
// exige que le plus petit jeu de mots soit inclus dans le plus grand — à
// taille égale, il faut l'égalité stricte. "B" est donc volontairement
// omis, comme "Cinais" l'a été pour Avoine Olympique Chinon Cinais.
// Aucun effectif "Stade Laval" (équipe première) n'est actuellement en
// base (vérifié via diagnostic-effectifs-laval.js), donc pas de risque de
// confusion avec la première équipe.
//
// Anti-doublon : ignore tout joueur dont le nom (accents/casse ignorés)
// existe déjà n'importe où en base, comme le fait le formulaire manuel.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const CLUB = 'Stade Laval';
const NIVEAU = 'N2';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF STADE LAVAL B", 26/27).
const EFFECTIF = [
  { prenom: 'Lucas', nom: 'Droyaux', poste: 'gardien', naissance: '2005-01-28' },
  { prenom: 'Mathias', nom: 'Germain', poste: 'defenseur_central', naissance: '2006-06-30' },
  { prenom: 'Sacha', nom: 'Burek', poste: 'lateral_gauche', naissance: '2007-01-21' },
  { prenom: 'Kaël', nom: 'Chaka', poste: 'lateral_gauche', naissance: '2007-08-06' },
  { prenom: 'Enzo', nom: 'Cadiou', poste: 'lateral_droit', naissance: '2005-04-01' },
  { prenom: 'Bilal', nom: 'Faye', poste: 'lateral_droit', naissance: '2005-04-07' },
  { prenom: 'Sacha', nom: 'Mellier', poste: 'milieu_central', naissance: '2008-05-18' },
  { prenom: 'Namory', nom: 'Diarra', poste: 'milieu_offensif', naissance: '2005-01-23' },
  { prenom: 'Aymen', nom: 'Leghrib', poste: 'milieu_offensif', naissance: '2007-01-04' },
  { prenom: 'Yanis', nom: 'Court', poste: 'milieu_offensif', naissance: '2008-12-16' },
  { prenom: 'Nolan', nom: 'Guérin', poste: 'attaquant', naissance: '2006-04-18' },
];

function normaliser(str) {
  return (str || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
function slugifier(str) {
  return normaliser(str).replace(/[^a-z0-9]+/g, '');
}

const { data: joueurs, error } = await supabase.from('joueurs').select('id, prenom, nom, club');
if (error) { console.error('Erreur lecture joueurs :', error.message); process.exit(1); }
console.log(`${joueurs?.length || 0} joueur(s) en base.\n`);

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
