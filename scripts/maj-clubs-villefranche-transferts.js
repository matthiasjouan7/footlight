// Met à jour le club de 3 joueurs vers FC Villefranche Beaujolais (confirmé
// par l'utilisateur — homonymes détectés lors de l'ajout de l'effectif FC
// Villefranche Beaujolais, ajouter-effectif-villefranche.js). Tous des
// transferts.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const NOUVEAU_CLUB = 'FC Villefranche Beaujolais';
const IDS = [
  'bdeda88e-0c0c-4b66-83bd-79a94faaa7d5', // Dembo Gassama
  '31c875e5-269c-40ec-a071-1cd8a3896c2f', // Marvin De Lima
  'e50df0c5-f81f-4e76-9f4c-efea8d94002d', // Nassim Sabihi
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
