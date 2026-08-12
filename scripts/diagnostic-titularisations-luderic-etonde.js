// Lecture seule : affiche les champs titularisations/matchs_remplacant
// actuels de Luderic Etonde (ligne joueurs + saison 2024-2025), pour
// comprendre l'incohérence signalée (18 matchs joués mais 29
// titularisations affichées).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

function normalizeName(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}

const { data: joueurs, error } = await supabase
  .from('joueurs')
  .select('id, prenom, nom, saison, matchs_joues, titularisations, matchs_remplacant');
if (error) { console.error('Erreur lecture joueurs :', error.message); process.exit(1); }

const cible = (joueurs || []).find(
  (j) => normalizeName(j.prenom) === 'luderic' && normalizeName(j.nom) === 'etonde'
);
if (!cible) { console.error('Joueur introuvable.'); process.exit(1); }

console.log('Ligne joueurs (saison courante) :', cible);

const { data: saisons } = await supabase
  .from('stats_saisons')
  .select('*')
  .eq('joueur_id', cible.id);
console.log('Lignes stats_saisons :', saisons);
