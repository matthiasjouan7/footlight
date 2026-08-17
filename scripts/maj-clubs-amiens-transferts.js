// Met à jour le club de 5 joueurs vers Amiens SC (confirmé par
// l'utilisateur — homonymes détectés lors de l'ajout de l'effectif
// Amiens SC, ajouter-effectif-amiens.js). Tous des transferts, y compris
// Gatien Foll dont le club était déjà "Amiens" (juste une correction
// d'écriture vers "Amiens SC").
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const NOUVEAU_CLUB = 'Amiens SC';
const IDS = [
  '03770ad6-6840-416e-a837-895046451170', // Lucas Llort
  '44b4294c-747e-42b4-846a-4e15fdaf60d5', // Gatien Foll
  '0e7b8c50-4e90-46c6-ad30-082a18c7588b', // Alexis Giacomini
  '90a07d5f-1447-4b11-b69e-13dd81c9bbbb', // Zourab Sopromadze
  '6cae3f11-49fa-42a7-9e6c-58dddabf790a', // Ely Julien
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
