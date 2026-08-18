// Met à jour le club de 2 joueurs vers US Concarneau (confirmé par
// l'utilisateur — homonymes détectés lors de l'ajout de l'effectif US
// Concarneau, ajouter-effectif-concarneau.js). Tous des transferts.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const NOUVEAU_CLUB = 'US Concarneau';
const IDS = [
  '2e116183-d187-4407-8e8d-63eee7fe98c0', // Sacha Inquel
  '69ca1b82-ae57-4cc1-ace9-ad23c7caeebe', // Baptiste Macon
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
