// Met à jour le club de Yanis Verdier vers "FC Fleury 91" (confirmé par
// l'utilisateur — simple correction d'écriture depuis "Fleury", pas un
// transfert). Détecté lors de l'ajout de l'effectif FC Fleury 91
// (ajouter-effectif-fleury.js).
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const NOUVEAU_CLUB = 'FC Fleury 91';
const ID = 'dc157916-5d36-4dfa-9cfa-3e105d41e73c'; // Yanis Verdier

const { data: avant, error: readErr } = await supabase.from('joueurs').select('prenom, nom, club').eq('id', ID).single();
if (readErr) { console.error(`Erreur lecture : ${readErr.message}`); process.exit(1); }
console.log(`${avant.prenom} ${avant.nom} : "${avant.club || '—'}" -> "${NOUVEAU_CLUB}"`);
if (!dryRun) {
  const { error } = await supabase.from('joueurs').update({ club: NOUVEAU_CLUB }).eq('id', ID);
  if (error) console.log(`  Erreur écriture : ${error.message}`);
}
console.log(dryRun ? '\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.' : '\nTerminé.');
