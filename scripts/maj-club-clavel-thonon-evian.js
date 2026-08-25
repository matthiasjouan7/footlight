// Met à jour le club de Maé Clavel, prêté à Thonon Évian Grand Genève FC
// (icône de prêt sur la capture d'écran "EFFECTIF THONON ÉVIAN GRAND GENÈVE
// FC"). Confirmé "transfert/prêt" par l'utilisateur. Ciblage par id (jamais
// par nom) pour éviter tout risque d'homonyme.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const ID = '47393a10-0149-4adb-b8ec-eb3bb0a9aa61';
const NOUVEAU_CLUB = 'Thonon Evian Gg Fc 1';

const { data: joueur, error: errLecture } = await supabase
  .from('joueurs').select('id, prenom, nom, club').eq('id', ID).single();
if (errLecture) { console.error('Erreur lecture joueur :', errLecture.message); process.exit(1); }
console.log(`${joueur.prenom} ${joueur.nom} (id=${joueur.id}) : club actuel = "${joueur.club}"`);
console.log(`  → nouveau club : "${NOUVEAU_CLUB}"`);

if (!dryRun) {
  const { error: errMaj } = await supabase
    .from('joueurs').update({ club: NOUVEAU_CLUB }).eq('id', ID);
  if (errMaj) console.log(`  Erreur écriture : ${errMaj.message}`);
  else console.log('  Mis à jour.');
}
if (dryRun) console.log('\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
