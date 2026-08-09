// Uniformise les noms de clubs dans calendrier_officiel (National 1, groupe
// B, saison 2026-2027) : plusieurs clubs apparaissent sous deux graphies
// différentes selon la journée (pas le même match en double — nettoyer-
// doublons-calendrier.js n'en trouve aucun — mais deux identités de club
// distinctes pour un même club réel). Chaque paire est unifiée vers le nom
// exact déjà utilisé dans la table joueurs (quand ce club y est déjà
// rattaché), pour que le rapprochement joueurs <-> calendrier fonctionne
// sans ambiguïté.
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
  ['Chauray', 'FC Chauray'],
  ['FC CHAURAY', 'FC Chauray'],
  ['Granville', 'US Granville'],
  ['US GRANVILLE', 'US Granville'],
  ['PONTIVY GSI', 'GSI Pontivy'],
  ['Pontivy', 'GSI Pontivy'],
  ['AVIRON BAYONNAIS', 'Aviron Bayonnais FC'],
  ['Bayonne', 'Aviron Bayonnais FC'],
  ['STADE BRIOCHIN', 'Stade Briochin'],
  ['Saint-Brieuc', 'Stade Briochin'],
  ['LE POIRE/VIE VF', 'Vendée Poiré Football'],
  ['Le Poiré-sur-Vie', 'Vendée Poiré Football'],
];

const { data, error } = await supabase
  .from('calendrier_officiel')
  .select('id, equipe_domicile, equipe_exterieur')
  .eq('division', 'N1')
  .eq('groupe', 'B');
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
