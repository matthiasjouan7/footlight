// Supprime le doublon de Paul-Émile Mimault (AS La Châtaigneraie) créé par
// erreur le 2026-08-24 : ajouter-effectif-chataigneraie.js a tenté
// d'insérer l'effectif complet sans détecter que 19 des 20 joueurs
// existaient déjà (en base depuis le 2026-08-11), suite à un diagnostic
// initial erroné (faute de frappe "chateigneraie"/"châteigneraie" au lieu
// de "châtaigneraie"). 17 insertions ont échoué sur un doublon d'email
// (comportement correct, aucune donnée créée), mais Paul-Émile Mimault a
// réussi à être inséré une seconde fois car le slug d'email généré par ce
// script (sans tiret) diffère de celui de la fiche d'origine (avec tiret :
// "paul-emile.mimault.manuel@..."), créant un vrai doublon
// (id=28f3a3de-d9d4-4a9b-a8f0-8170b0271c01, à supprimer) à côté de la
// fiche d'origine (id=b174f656-485c-411e-bfc4-09e10b04a79f, à conserver).
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

const ID_A_SUPPRIMER = '28f3a3de-d9d4-4a9b-a8f0-8170b0271c01';

const { data: avant, error: readErr } = await supabase
  .from('joueurs').select('id, prenom, nom, club, email, created_at').eq('id', ID_A_SUPPRIMER).single();
if (readErr || !avant) {
  console.log(`Introuvable (id=${ID_A_SUPPRIMER}), rien à faire. ${readErr?.message || ''}`);
  process.exit(0);
}
console.log(`À supprimer : ${avant.prenom} ${avant.nom} (id=${avant.id}, club="${avant.club}", email=${avant.email}, créé le ${avant.created_at})`);

if (!dryRun) {
  const { error: delErr } = await supabase.from('joueurs').delete().eq('id', ID_A_SUPPRIMER);
  if (delErr) console.log(`  Erreur suppression : ${delErr.message}`);
  else console.log('  Supprimé.');
}
if (dryRun) console.log('\nDRY RUN : rien n\'a été supprimé. Relancer avec DRY_RUN=false pour supprimer réellement.');
