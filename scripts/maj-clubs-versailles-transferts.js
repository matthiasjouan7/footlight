// Met à jour le club de Djibril Khouma et Ange Badey suite à leur transfert
// vers FC Versailles 78 (confirmé par l'utilisateur — homonymes détectés
// lors de l'ajout de l'effectif FC Versailles 78,
// ajouter-effectif-versailles.js).
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const NOUVEAU_CLUB = 'FC Versailles 78';
const IDS = [
  '42c5762c-6190-4469-a891-531683f68855', // Djibril Khouma
  'b42b69d0-3974-417f-971d-6fde157b26d7', // Ange Badey
];

for (const id of IDS) {
  const { data: avant, error: readErr } = await supabase.from('joueurs').select('prenom, nom, club').eq('id', id).single();
  if (readErr) { console.log(`${id} : erreur lecture (${readErr.message}).`); continue; }
  console.log(`${avant.prenom} ${avant.nom} : "${avant.club || '—'}" -> "${NOUVEAU_CLUB}"`);
  if (!dryRun) {
    const { error } = await supabase.from('joueurs').update({ club: NOUVEAU_CLUB }).eq('id', id);
    if (error) console.log(`  Erreur écriture : ${error.message}`);
  }
}
console.log(dryRun ? '\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.' : '\nTerminé.');
