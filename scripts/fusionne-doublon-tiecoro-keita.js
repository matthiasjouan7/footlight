// Supprime le doublon de fiche joueur "Tiécoro Keita" (Espaly 1, N2 groupe
// G) confirmé par l'utilisateur comme étant la même personne que la fiche
// conservée (id=c8a53122-e2b1-40a3-be8b-500dd85f6b29, créée le 09/08,
// nationalité France). La fiche à supprimer (id=e09134cf-b981-4b77-a468-
// 91678c7fc5f4, créée le 26/08, nationalité Mali) n'a aucune ligne
// matchs_joueur renseignée (26 lignes, toutes à null) : rien à rattacher,
// simple suppression des lignes matchs_joueur puis de la fiche joueur.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const DRY_RUN = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const ID_A_SUPPRIMER = 'e09134cf-b981-4b77-a468-91678c7fc5f4';
const ID_A_GARDER = 'c8a53122-e2b1-40a3-be8b-500dd85f6b29';

console.log(`Mode : ${DRY_RUN ? 'DRY_RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}\n`);

const { data: joueurASupprimer, error: errJ } = await supabase.from('joueurs').select('id, prenom, nom, club, nationalite').eq('id', ID_A_SUPPRIMER).maybeSingle();
if (errJ) { console.error('Erreur lecture joueur à supprimer :', errJ.message); process.exit(1); }
if (!joueurASupprimer) { console.error(`Joueur id=${ID_A_SUPPRIMER} introuvable (déjà supprimé ?).`); process.exit(1); }
console.log(`À supprimer : ${joueurASupprimer.prenom} ${joueurASupprimer.nom} (${joueurASupprimer.club}, ${joueurASupprimer.nationalite}, id=${joueurASupprimer.id})`);

const { data: joueurAGarder, error: errG } = await supabase.from('joueurs').select('id, prenom, nom, club, nationalite').eq('id', ID_A_GARDER).maybeSingle();
if (errG || !joueurAGarder) { console.error('Joueur à garder introuvable :', errG?.message); process.exit(1); }
console.log(`Conservé : ${joueurAGarder.prenom} ${joueurAGarder.nom} (${joueurAGarder.club}, ${joueurAGarder.nationalite}, id=${joueurAGarder.id})\n`);

const { data: mjASupprimer, error: errMj } = await supabase.from('matchs_joueur').select('id, calendrier_officiel_id, minutes_jouees').eq('joueur_id', ID_A_SUPPRIMER);
if (errMj) { console.error('Erreur lecture matchs_joueur :', errMj.message); process.exit(1); }

const avecStats = (mjASupprimer || []).filter((m) => m.minutes_jouees != null);
if (avecStats.length) {
  console.error(`ATTENTION : ${avecStats.length} ligne(s) matchs_joueur du doublon ont déjà des stats renseignées — abandon par sécurité, vérifier manuellement avant de continuer.`);
  process.exit(1);
}
console.log(`${(mjASupprimer || []).length} ligne(s) matchs_joueur à supprimer (toutes vides, aucune stat perdue).\n`);

console.log(`${DRY_RUN ? 'À supprimer' : 'Suppression'} : ${(mjASupprimer || []).length} ligne(s) matchs_joueur (joueur_id=${ID_A_SUPPRIMER})`);
if (!DRY_RUN) {
  const { error } = await supabase.from('matchs_joueur').delete().eq('joueur_id', ID_A_SUPPRIMER);
  if (error) { console.error('Erreur suppression matchs_joueur :', error.message); process.exit(1); }
}

console.log(`${DRY_RUN ? 'À supprimer' : 'Suppression'} : fiche joueur id=${ID_A_SUPPRIMER}`);
if (!DRY_RUN) {
  const { error } = await supabase.from('joueurs').delete().eq('id', ID_A_SUPPRIMER);
  if (error) { console.error('Erreur suppression joueur :', error.message); process.exit(1); }
}

console.log(`\n${DRY_RUN ? 'DRY_RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.' : 'Terminé : doublon supprimé.'}`);
