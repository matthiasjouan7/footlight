// Met à jour le champ club de joueurs identifiés dans une liste de
// transferts fournie par l'utilisateur (voir diagnostic-transferts-liste.js
// pour le rapprochement initial). Ne touche qu'aux joueurs dont le club a
// réellement changé — les cas déjà à jour (ex: "US Le Pays du Valois" déjà
// en base pour la forme courte "Pays du Valois" de la liste, ou joueurs déjà
// identiques) sont volontairement exclus après confirmation.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const MISES_A_JOUR = [
  { id: 'e01618da-5247-4db8-b13a-89fae5f17ca6', nom: 'Nathanaël Bai', club: 'AS Saint-Priest' },
  { id: '0bcaf748-6f47-4432-9128-bd8852311a38', nom: 'Lucas Rigaud', club: 'Mi. Trévoux' },
  { id: '37253032-e047-4d74-ad41-6d62866a5236', nom: 'Paul Meliande', club: 'Pays du Valois' },
  { id: '49ae7f3d-89c6-40fb-ab84-c96a0ee38363', nom: 'Nathan Deheppe', club: 'FR Haguenau' },
  { id: '6f1f405c-72ef-457c-96c4-87bc87ba3f05', nom: 'Peterson Paul', club: 'AS Furiani' },
];

for (const m of MISES_A_JOUR) {
  const { data: avant } = await supabase.from('joueurs').select('club').eq('id', m.id).single();
  console.log(`${m.nom} : "${avant?.club || '—'}" -> "${m.club}"`);
  if (!dryRun) {
    const { error } = await supabase.from('joueurs').update({ club: m.club }).eq('id', m.id);
    if (error) console.log(`  Erreur écriture : ${error.message}`);
  }
}
console.log(dryRun ? '\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.' : '\nTerminé.');
