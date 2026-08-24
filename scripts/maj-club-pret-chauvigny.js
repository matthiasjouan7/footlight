// Met à jour le club de 4 joueurs prêtés à US Chauvigny (National 2,
// saison 2026-2027) : présents dans la capture d'écran de l'effectif avec
// une icône de prêt, déjà en base sous club="Stade Poitevin FC" (identifiés
// via ajouter-effectif-chauvigny.js). Ciblage par id pour éviter tout
// risque d'erreur.
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

const NOUVEAU_CLUB = 'US Chauvigny';
const IDS = [
  'c8be5826-3a9d-4d71-b5d7-36e89e9ad75b', // Ben Soilihi Aboubacar
  'b4f2fa71-25b1-4492-b684-43efcd8f0d5e', // Célian Chassain
  'c5b64dbc-45aa-4c85-ac9a-89462f227eee', // Paco Mathis
  'cd45220e-12e7-4712-95e6-8ae27d8b3943', // Clément Grégoire
];

for (const id of IDS) {
  const { data: avant, error: readErr } = await supabase
    .from('joueurs').select('id, prenom, nom, club').eq('id', id).single();
  if (readErr || !avant) {
    console.log(`Introuvable (id=${id}), rien à faire. ${readErr?.message || ''}`);
    continue;
  }
  console.log(`${avant.prenom} ${avant.nom} : club "${avant.club}" -> "${NOUVEAU_CLUB}" (id=${avant.id}).`);
  if (!dryRun) {
    const { error: updErr } = await supabase.from('joueurs').update({ club: NOUVEAU_CLUB }).eq('id', id);
    if (updErr) console.log(`  Erreur écriture : ${updErr.message}`);
    else console.log('  Mis à jour.');
  }
}
if (dryRun) console.log('\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
