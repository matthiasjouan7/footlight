// Ajoute la fiche de Ruben Rosa (QRM, Ligue 3, saison 2026-2027), demandée
// par l'utilisateur (capture d'écran source : ailier droit, né 25 déc.
// 2006, France (Chauny), 3 matchs, 1 but, 0 passe décisive, 0 carton,
// 67% titularisations, 50% minutes jouées). Repéré au préalable comme
// "R. Rosa" non inscrit dans diagnostic-buteurs-non-inscrits.js.
//
// Club = "QRM" (pas "QRM B") : le match affiché sur la capture
// ("FC ROUEN 1899 vs QRM", journée 3) correspond exactement à un match du
// calendrier officiel Ligue 3 (déjà vu comme adversaire de VFC La
// Roche-sur-Yon) — utilise donc le nom officiel exact pour un
// rapprochement calendrier immédiat, sans dépendre du synonyme QRM déjà
// existant dans CLUB_SYNONYMES_COMPLETS.
//
// N'insère PAS les stats de la capture en dur : la fiche est créée avec
// des totaux à zéro, les vraies stats seront reprises depuis lequipe.fr
// (calendrier) puis synchronisées (buts/cartons/minutes), pas recopiées
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
  prenom: 'Ruben', nom: 'Rosa', poste: 'ailier_droit',
  naissance: '2006-12-25', nationalite: 'France', taille: null,
};
const CLUB = 'QRM';
const NIVEAU = 'Ligue 3';
const SAISON = '2026-2027';

function normaliser(str) {
  return (str || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
function slugifier(str) {
  return normaliser(str).replace(/[^a-z0-9]+/g, '');
}
const email = `${slugifier(j.prenom)}.${slugifier(j.nom)}.qrm.manuel@scoute.footlight.fr`;

console.log(`${j.prenom} ${j.nom} : à créer (${j.poste}, ${CLUB}, ${NIVEAU}, né(e) ${j.naissance}, ${j.nationalite}, email=${email}).`);
if (!dryRun) {
  const { error: insErr } = await supabase.from('joueurs').insert([{
    prenom: j.prenom, nom: j.nom, email,
    poste: j.poste,
    niveau: NIVEAU, club: CLUB, saison: SAISON,
    date_naissance: j.naissance,
    nationalite: j.nationalite,
    matchs_joues: 0,
    buts: 0,
    badge: 'declaratif',
    profil_public: true,
  }]);
  if (insErr) console.log(`  Erreur écriture : ${insErr.message}`);
  else console.log('  Créé.');
}
if (dryRun) console.log('\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
