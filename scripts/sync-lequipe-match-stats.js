// Rapproche les buts/cartons/minutes jouées d'un match (lequipe.fr) avec
// les joueurs FootLight qui ont déjà généré ce match dans leur historique
// (via "Générer mon calendrier"), et propose de compléter buts/
// cartons_jaunes/cartons_rouges/minutes_jouees — UNIQUEMENT les champs
// encore vides (on n'écrase jamais une stat que le joueur a saisie
// lui-même). Traite une seule journée (celle affichée par défaut sur la
// page calendrier-resultats de la compétition) — utilitaire pour un test
// ciblé. L'automatisation planifiée utilise désormais
// sync-lequipe-match-stats-auto.js (toutes les journées déjà jouées,
// quotidien) ; pour un rattrapage manuel sur une plage précise, voir
// rattrapage-lequipe-match-stats.js.
//
// Sécurité : DRY_RUN=true par défaut — logue ce qui serait fait sans rien
// écrire. Il faut positionner explicitement DRY_RUN=false pour écrire.
import { createClient } from '@supabase/supabase-js';
import { syncMatchStats } from './lib-sync-lequipe-match-stats.js';

const targetUrl = process.env.TARGET_URL;
const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!targetUrl) {
  console.error('TARGET_URL manquant.');
  process.exit(1);
}
if (!supabaseKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY manquant (nécessaire même en DRY_RUN, pour lire les données existantes).');
  process.exit(1);
}
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);

const supabase = createClient(supabaseUrl, supabaseKey);

const resultat = await syncMatchStats(targetUrl, supabase, dryRun);
if (!resultat) process.exit(1);
if (dryRun) console.log('DRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
