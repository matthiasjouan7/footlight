// Met à jour le club de Rayane Ekra vers "Valenciennes FC" (confirmé par
// l'utilisateur — il est bien à Valenciennes, simple correction d'écriture
// depuis "Valenciennes", pas un transfert). Détecté lors de l'ajout de
// l'effectif Valenciennes FC (ajouter-effectif-valenciennes.js).
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const NOUVEAU_CLUB = 'Valenciennes FC';
const ID = '43b7bb89-932f-41a7-8efd-24c9ceb8b0a4'; // Rayane Ekra

const { data: avant, error: readErr } = await supabase.from('joueurs').select('prenom, nom, club').eq('id', ID).single();
if (readErr) { console.error(`Erreur lecture : ${readErr.message}`); process.exit(1); }
console.log(`${avant.prenom} ${avant.nom} : "${avant.club || '—'}" -> "${NOUVEAU_CLUB}"`);
if (!dryRun) {
  const { error } = await supabase.from('joueurs').update({ club: NOUVEAU_CLUB }).eq('id', ID);
  if (error) console.log(`  Erreur écriture : ${error.message}`);
}
console.log(dryRun ? '\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.' : '\nTerminé.');
