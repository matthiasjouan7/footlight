// Met à jour le club de 2 joueurs prêtés à Trélissac FC (National 2 groupe
// A, saison 2026-2027), identifiés lors de l'ajout de l'effectif Trélissac
// (icône "prêt" sur la capture d'écran source) et confirmés par
// l'utilisateur.
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

const NOUVEAU_CLUB = 'Trélissac FC';

// Confirmé par l'utilisateur : joueurs prêtés à Trélissac FC pour la saison
// 2026-2027 (Pierre Portets depuis l'Aviron Bayonnais FC, Wilfried Baana
// Jaba depuis le Stade Poitevin FC).
const A_METTRE_A_JOUR = [
  { id: 'cb1a1d6e-65c9-4ceb-a929-e197fee20c3a', prenom: 'Pierre', nom: 'Portets' },
  { id: '0f6648ed-e4c1-4761-8259-a73849bc342e', prenom: 'Wilfried', nom: 'Baana Jaba' },
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
