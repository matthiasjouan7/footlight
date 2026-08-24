// Met à jour le club de 2 joueurs prêtés à Cestas SAG (National 2 groupe A,
// saison 2026-2027) par Bordeaux, identifiés lors de l'ajout de l'effectif
// SA Gazinet Cestas (icône "prêt" sur la capture d'écran source) et
// confirmés par l'utilisateur.
//
// Ciblage par id (et non par nom) pour éviter tout risque d'homonymie.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const NOUVEAU_CLUB = 'Cestas SAG';

// Confirmé par l'utilisateur : joueurs prêtés par Bordeaux à Cestas SAG pour
// la saison 2026-2027.
const A_METTRE_A_JOUR = [
  { id: '6b3af918-b2cd-4a7b-84ae-9fd71ce1aaf7', prenom: 'Nathan', nom: 'Besse' },
  { id: '4cb9400f-3abf-42ca-b1a3-c334f2f27c2b', prenom: 'Marius', nom: 'Feuillet' },
];

for (const j of A_METTRE_A_JOUR) {
  const { data: avant, error: readErr } = await supabase
    .from('joueurs').select('id, prenom, nom, club').eq('id', j.id).single();
  if (readErr || !avant) {
    console.log(`${j.prenom} ${j.nom} (id=${j.id}) : introuvable en base, ignoré. ${readErr?.message || ''}`);
    continue;
  }
  console.log(`${avant.prenom} ${avant.nom} (id=${avant.id}) : club "${avant.club}" -> "${NOUVEAU_CLUB}"`);
  if (!dryRun) {
    const { error: updErr } = await supabase.from('joueurs').update({ club: NOUVEAU_CLUB }).eq('id', j.id);
    if (updErr) console.log(`  Erreur écriture : ${updErr.message}`);
  }
}
if (dryRun) console.log('\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
