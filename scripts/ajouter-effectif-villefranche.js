// Ajoute les joueurs manquants de l'effectif FC Villefranche Beaujolais
// (Ligue 3, saison 2026-2027) fourni par l'utilisateur (capture d'écran
// type transfermarkt). Même chemin que les scripts précédents (Bastia,
// Versailles, Caen, Amiens, Valenciennes, Orléans, Fleury).
//
// Anti-doublon : ignore tout joueur dont le nom (accents/casse ignorés)
// existe déjà n'importe où en base.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const CLUB = 'FC Villefranche Beaujolais';
const NIVEAU = 'Ligue 3';
const SAISON = '2026-2027';

// Liste extraite de la capture d'écran ("EFFECTIF FC VILLEFRANCHE-BEAUJOLAIS", 26/27).
const EFFECTIF = [
  { prenom: 'Sullivan', nom: 'Péan', poste: 'gardien', naissance: '1999-10-27' },
  { prenom: 'Marvin', nom: 'Tshibuabua', poste: 'defenseur_central', naissance: '2002-01-08' },
  { prenom: 'Boris', nom: 'Moltenis', poste: 'defenseur_central', naissance: '1999-05-08' },
  { prenom: 'Yacine', nom: 'Sofiane', poste: 'defenseur_central', naissance: '2005-04-13' },
  { prenom: 'Dembo', nom: 'Gassama', poste: 'defenseur_central', naissance: '1997-11-16' },
  { prenom: 'Saidou', nom: 'Ouedraogo', poste: 'lateral_gauche', naissance: '2004-11-17' },
  { prenom: 'Fred', nom: 'Ondoa Onambele', poste: 'lateral_gauche', naissance: '2007-06-26' },
  { prenom: 'Roman', nom: 'Laspalles', poste: 'lateral_droit', naissance: '1996-11-02' },
  { prenom: 'Kemryk', nom: 'Nagera', poste: 'lateral_droit', naissance: '2005-05-31' },
  { prenom: 'Loïc', nom: 'Etoga', poste: 'milieu_defensif', naissance: '2003-04-01' },
  { prenom: 'Paolo', nom: 'Limon', poste: 'milieu_defensif', naissance: '2005-12-05' },
  { prenom: 'Mathieu', nom: 'Cachbach', poste: 'milieu_central', naissance: '2001-05-23' },
  { prenom: 'Léo', nom: 'Yobé', poste: 'milieu_central', naissance: '1998-09-10' },
  { prenom: 'Mourad', nom: 'Louzif', poste: 'milieu_central', naissance: '2000-07-11' },
  { prenom: 'Marvin', nom: 'De Lima', poste: 'milieu_offensif', naissance: '2004-04-19' },
  { prenom: 'Adama', nom: 'Diakité', poste: 'ailier_gauche', naissance: '1999-07-16' },
  { prenom: 'Nassim', nom: 'Sabihi', poste: 'ailier_droit', naissance: '2002-03-18' },
  { prenom: 'Malick', nom: 'Assef', poste: 'ailier_droit', naissance: '1994-06-12' },
  { prenom: 'Yohan', nom: 'Tadé', poste: 'ailier_droit', naissance: '2004-01-19' },
  { prenom: 'Loïck', nom: 'Piquionne', poste: 'attaquant', naissance: '2001-04-17' },
  { prenom: 'Jean-Pierre', nom: 'Tiéhi', poste: 'attaquant', naissance: '2002-01-24' },
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
