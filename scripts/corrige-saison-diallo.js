// Corrige la saison de la ligne stats_saisons de Cherif Diallo, signalée
// par l'utilisateur comme mal étiquetée : les statistiques (23 matchs,
// Chateaubriant, N2, 3 buts, 1 passe, 1929 min, 5 CJ, 1 CR) enregistrées
// sous "2024-2025" sont en réalité celles de la saison "2025-2026".
//
// Diagnostic (check-joueur.yml, nom="Cherif Diallo") : une seule ligne
// stats_saisons existe pour ce joueur (id 8d6c952b-2373-48ac-a3df-0d6494ff091d),
// avec saison="2024-2025" — c'est cette ligne qu'on corrige.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const ID = '8d6c952b-2373-48ac-a3df-0d6494ff091d'; // stats_saisons de Cherif Diallo
const ANCIENNE_SAISON = '2024-2025';
const NOUVELLE_SAISON = '2025-2026';

const { data: avant, error: readErr } = await supabase
  .from('stats_saisons')
  .select('id, joueur_id, saison, club, niveau, matchs_joues, buts')
  .eq('id', ID)
  .single();
if (readErr) { console.error(`Erreur lecture : ${readErr.message}`); process.exit(1); }

console.log(`Ligne stats_saisons ${avant.id} (joueur_id=${avant.joueur_id}, club="${avant.club}", ${avant.matchs_joues} matchs, ${avant.buts} buts)`);
console.log(`saison : "${avant.saison}" -> "${NOUVELLE_SAISON}"`);

if (avant.saison !== ANCIENNE_SAISON) {
  console.error(`Attendu saison="${ANCIENNE_SAISON}", trouvé "${avant.saison}". Arrêt par précaution.`);
  process.exit(1);
}

if (!dryRun) {
  const { error } = await supabase.from('stats_saisons').update({ saison: NOUVELLE_SAISON }).eq('id', ID);
  if (error) console.log(`  Erreur écriture : ${error.message}`);
}
console.log(dryRun ? '\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.' : '\nTerminé.');
