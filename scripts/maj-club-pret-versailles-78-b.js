// Met à jour le club de Kwouni Ngassa, prêté à Versailles 78 Fc 2 (National
// 2, saison 2026-2027) — signalé par l'utilisateur (icône de prêt sur la
// capture d'écran), confirmé par l'utilisateur.
//
// Ciblage par id pour éviter tout risque d'erreur.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const ID_KWOUNI_NGASSA = 'e0f924dd-0a39-4440-adcd-44afc65086d8';
const NOUVEAU_CLUB = 'Versailles 78 Fc 2';

const { data: avant, error: readErr } = await supabase
  .from('joueurs').select('id, prenom, nom, club').eq('id', ID_KWOUNI_NGASSA).single();
if (readErr || !avant) {
  console.log(`Introuvable (id=${ID_KWOUNI_NGASSA}). ${readErr?.message || ''}`);
  process.exit(1);
}
console.log(`${avant.prenom} ${avant.nom} : club "${avant.club}" -> "${NOUVEAU_CLUB}"`);

if (!dryRun) {
  const { error: updErr } = await supabase.from('joueurs').update({ club: NOUVEAU_CLUB }).eq('id', ID_KWOUNI_NGASSA);
  if (updErr) console.log(`  Erreur mise à jour : ${updErr.message}`);
  else console.log('  Mis à jour.');
}
if (dryRun) console.log('\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
