// Ajoute la fiche de Kamil Bensoula (VFC La Roche-sur-Yon, Ligue 3, saison
// 2026-2027), demandée par l'utilisateur (capture d'écran source : #8,
// milieu offensif, né 1 nov. 2005, Algérie, 1,76 m, 3 matchs, 2 passes
// décisives, 1 carton jaune, 100% titularisations, 73% minutes jouées).
//
// Vérification homonyme (diagnostic-homonyme-bensoula.js) : 2 "Bensoula"
// déjà en base, mais prénoms différents et clubs différents (Naël
// Bensoula, Vendée Poiré Football, N1 ; Noham Bensoula, AS Vitré, N2) —
// aucun rapport avec Kamil Bensoula à VFC La Roche-sur-Yon en Ligue 3 :
// personne distincte, création d'une nouvelle fiche.
//
// N'insère PAS les stats de la capture (matchs/buts/passes/cartons) en dur
// : la fiche est créée avec des totaux à zéro, comme le ferait le joueur
// lui-même en s'inscrivant ; les vraies stats seront reprises depuis
// lequipe.fr par generer-calendriers-existants.js (calendrier) puis
// rattrapage-lequipe-match-stats.js (buts/cartons/minutes), pas recopiées
// depuis une capture d'écran tierce.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const j = {
  prenom: 'Kamil', nom: 'Bensoula', poste: 'milieu_offensif',
  naissance: '2005-11-01', nationalite: 'Algérie', taille: 176,
};
const CLUB = 'VFC La Roche-sur-Yon';
const NIVEAU = 'Ligue 3';
const SAISON = '2026-2027';

function normaliser(str) {
  return (str || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
function slugifier(str) {
  return normaliser(str).replace(/[^a-z0-9]+/g, '');
}
const email = `${slugifier(j.prenom)}.${slugifier(j.nom)}.laroche.manuel@scoute.footlight.fr`;

console.log(`${j.prenom} ${j.nom} : à créer (${j.poste}, ${CLUB}, ${NIVEAU}, né(e) ${j.naissance}, ${j.nationalite}, ${j.taille} cm, email=${email}).`);
if (!dryRun) {
  const { error: insErr } = await supabase.from('joueurs').insert([{
    prenom: j.prenom, nom: j.nom, email,
    poste: j.poste,
    niveau: NIVEAU, club: CLUB, saison: SAISON,
    date_naissance: j.naissance,
    nationalite: j.nationalite,
    taille: j.taille,
    matchs_joues: 0,
    buts: 0,
    badge: 'declaratif',
    profil_public: false,
  }]);
  if (insErr) console.log(`  Erreur écriture : ${insErr.message}`);
  else console.log('  Créé.');
}
if (dryRun) console.log('\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
