// Uniformise les noms de clubs dans calendrier_officiel (National 2, groupe
// C, saison 2026-2027) : les noms saisis portent un suffixe numérique ("1"
// ou "2") et des abréviations qui ne correspondent pas au nom exact déjà
// utilisé dans la table joueurs pour ces mêmes clubs, ce qui casserait le
// rapprochement automatique (import joueurs, synchro des stats). PTT Caen,
// FC St-Lô Manche et St Brieuc Ginglin ne sont pas encore en base (clubs
// promus, pas encore d'effectif importé) : pas de renommage à faire pour eux
// pour l'instant.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);

const supabase = createClient(supabaseUrl, supabaseKey);

// [nom_a_corriger, nom_canonique]
const RENOMMAGES = [
  ['Cesson Oc 1', 'OC Cesson-Sévigné'],
  ['Ea Guingamp 2', 'EA Guingamp B'],
  ['Milizac St P 1', 'St-Pierre de Milizac'],
  ['Stade Brestois 29 2', 'Stade Brest 29 B'],
  ['Stade Rennais Fc 2', 'Stade Rennais FC B'],
];

const { data, error } = await supabase
  .from('calendrier_officiel')
  .select('id, equipe_domicile, equipe_exterieur')
  .eq('division', 'N2')
  .eq('groupe', 'C');
if (error) { console.error('Erreur lecture calendrier_officiel :', error.message); process.exit(1); }

let nbLignes = 0;
for (const row of data || []) {
  const renDomicile = RENOMMAGES.find(([ancien]) => ancien === row.equipe_domicile);
  const renExterieur = RENOMMAGES.find(([ancien]) => ancien === row.equipe_exterieur);
  if (!renDomicile && !renExterieur) continue;

  const nouveauDomicile = renDomicile ? renDomicile[1] : row.equipe_domicile;
  const nouveauExterieur = renExterieur ? renExterieur[1] : row.equipe_exterieur;
  console.log(`id=${row.id} : "${row.equipe_domicile}" vs "${row.equipe_exterieur}" -> "${nouveauDomicile}" vs "${nouveauExterieur}"`);
  nbLignes++;

  if (!dryRun) {
    const { error: updErr } = await supabase
      .from('calendrier_officiel')
      .update({ equipe_domicile: nouveauDomicile, equipe_exterieur: nouveauExterieur })
      .eq('id', row.id);
    if (updErr) { console.error(`Erreur mise à jour id=${row.id} :`, updErr.message); process.exit(1); }
  }
}

console.log(`\n${nbLignes} ligne(s) ${dryRun ? 'à corriger' : 'corrigée(s)'}.`);
if (dryRun) console.log('DRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour appliquer réellement.');
else console.log('Terminé.');
