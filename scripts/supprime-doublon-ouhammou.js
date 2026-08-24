// Supprime le doublon de Yanis/Yannis Ouhammou (Deauville) confirmé par
// l'utilisateur : deux fiches pour le même joueur, orthographe légèrement
// différente du prénom.
//
// Conservée : id=5983b407-bbd0-45c3-a70c-9b189169c58a (Yannis Ouhammou,
// club="AS Trouville-Deauville-Villers", créé le 2026-08-11, date de
// naissance renseignée, nom de club canonique du calendrier).
//
// Supprimée : id=03e0a2fb-4518-432d-af80-3ab867501d93 (Yanis Ouhammou,
// club="Deauville", créé le 2026-07-17, sans date de naissance).
//
// Les lignes matchs_joueur liées à la fiche supprimée sont retirées
// d'abord (contrainte de clé étrangère), puis la fiche joueurs elle-même.
//
// Ciblage par id pour éviter tout risque d'erreur.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const ID_A_SUPPRIMER = '03e0a2fb-4518-432d-af80-3ab867501d93';

const { data: avant, error: readErr } = await supabase
  .from('joueurs').select('id, prenom, nom, club, email, created_at').eq('id', ID_A_SUPPRIMER).single();
if (readErr || !avant) {
  console.log(`Introuvable (id=${ID_A_SUPPRIMER}), rien à faire. ${readErr?.message || ''}`);
  process.exit(0);
}
console.log(`À supprimer : ${avant.prenom} ${avant.nom} (id=${avant.id}, club="${avant.club}", email=${avant.email}, créé le ${avant.created_at})`);

const { count: nbMatchs, error: countErr } = await supabase
  .from('matchs_joueur').select('id', { count: 'exact', head: true }).eq('joueur_id', ID_A_SUPPRIMER);
if (countErr) { console.error('Erreur lecture matchs_joueur :', countErr.message); process.exit(1); }
console.log(`  ${nbMatchs ?? 0} ligne(s) matchs_joueur liée(s) à supprimer d'abord.`);

if (!dryRun) {
  const { error: delMjErr } = await supabase.from('matchs_joueur').delete().eq('joueur_id', ID_A_SUPPRIMER);
  if (delMjErr) { console.log(`  Erreur suppression matchs_joueur : ${delMjErr.message}`); process.exit(1); }
  console.log('  matchs_joueur supprimés.');

  const { error: delErr } = await supabase.from('joueurs').delete().eq('id', ID_A_SUPPRIMER);
  if (delErr) console.log(`  Erreur suppression joueur : ${delErr.message}`);
  else console.log('  Joueur supprimé.');
}
if (dryRun) console.log('\nDRY RUN : rien n\'a été supprimé. Relancer avec DRY_RUN=false pour supprimer réellement.');
