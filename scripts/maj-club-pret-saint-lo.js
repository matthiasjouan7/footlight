// Met à jour le club de Franck Mefouma, prêté à FC St-Lô Manche (National 2,
// saison 2026-2027) : présent dans la capture d'écran de l'effectif avec
// une icône de prêt, déjà en base sous club="US Granville" (identifié via
// ajouter-effectif-saint-lo.js). Ciblage par id pour éviter tout risque
// d'erreur.
//
// Confirmé par l'utilisateur avant exécution.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const NOUVEAU_CLUB = 'FC St-Lô Manche';
const ID = '5ce97d61-4cbc-4d4e-810f-dd62c90d5c5f'; // Franck Mefouma

const { data: avant, error: readErr } = await supabase
  .from('joueurs').select('id, prenom, nom, club').eq('id', ID).single();
if (readErr || !avant) {
  console.log(`Introuvable (id=${ID}), rien à faire. ${readErr?.message || ''}`);
} else {
  console.log(`${avant.prenom} ${avant.nom} : club "${avant.club}" -> "${NOUVEAU_CLUB}" (id=${avant.id}).`);
  if (!dryRun) {
    const { error: updErr } = await supabase.from('joueurs').update({ club: NOUVEAU_CLUB }).eq('id', ID);
    if (updErr) console.log(`  Erreur écriture : ${updErr.message}`);
    else console.log('  Mis à jour.');
  }
}
if (dryRun) console.log('\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
