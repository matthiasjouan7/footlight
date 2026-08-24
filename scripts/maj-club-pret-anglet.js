// Met à jour le club de 4 joueurs prêtés à Anglet Genêts Foot (National 2
// groupe A, saison 2026-2027) par l'Aviron Bayonnais FC, identifiés lors de
// l'ajout de l'effectif Anglet (icône "prêt" sur la capture d'écran source)
// et confirmés par l'utilisateur.
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

const NOUVEAU_CLUB = 'Anglet Genêts Foot';

// Confirmé par l'utilisateur : joueurs prêtés par l'Aviron Bayonnais FC à
// Anglet Genêts Foot pour la saison 2026-2027.
const A_METTRE_A_JOUR = [
  { id: '1ce7f003-76cc-46b9-988e-ab817646a4d1', prenom: 'Eneko', nom: 'Feltrin' },
  { id: '4013eb2c-b77e-4008-989c-6bdbd9aec2ff', prenom: 'Valentin', nom: 'Picoulet' },
  { id: 'a0898575-1d09-4e85-99d3-66941e184697', prenom: 'Thibault', nom: 'Lapeyre' },
  { id: 'c416e5ed-25d7-4ee8-a038-fb169c8f5e33', prenom: 'Hugo', nom: 'Dellas' },
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
