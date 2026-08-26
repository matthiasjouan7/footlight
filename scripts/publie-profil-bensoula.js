// Rend le profil de Kamil Bensoula public (profil_public: true), pour qu'il
// apparaisse dans les recherches — l'utilisateur signale ne pas le voir
// dans la base, cause : profil_public reste à false par défaut pour tout
// joueur ajouté manuellement (comportement standard de la plateforme).
// DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const JOUEUR_ID = '0420f770-0ed6-492b-a517-42ff8283b167';

if (!dryRun) {
  const { error } = await supabase.from('joueurs').update({ profil_public: true }).eq('id', JOUEUR_ID);
  if (error) { console.error('Erreur :', error.message); process.exit(1); }
  console.log('profil_public passé à true pour Kamil Bensoula.');
} else {
  console.log('DRY RUN : rien n\'a été écrit.');
}
