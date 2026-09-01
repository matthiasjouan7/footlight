// Diagnostic lecture seule : confirme l'hypothèse de doublon
// calendrier_officiel pour AS PTT Caen (N2 groupe C) et Aubervilliers
// (N2 groupe E) — deux lignes calendrier_officiel pour le même match
// réel sous deux orthographes différentes, dont une seule est la cible
// du rapprochement FFF automatique (celle qui correspond au nom brut
// FFF), l'autre portant les matchs_joueur déjà générés pour les joueurs
// inscrits. Affiche, pour chaque paire candidate, le nombre de lignes
// matchs_joueur rattachées à chacun des deux ids.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const SAISON = '2026-2027';

const PAIRES = [
  { nom: 'AS PTT Caen (groupe C)', idFffCible: 855, idAutre: 3346 },
  { nom: 'Aubervilliers (groupe E)', idA: null, idB: null }, // à résoudre dynamiquement
];

async function compterMj(id) {
  const { data, error } = await supabase.from('matchs_joueur').select('id, joueur_id, minutes_jouees').eq('calendrier_officiel_id', id);
  if (error) { console.error(`Erreur matchs_joueur id=${id} :`, error.message); return null; }
  return data;
}

async function afficherLigne(id) {
  const { data, error } = await supabase.from('calendrier_officiel').select('id, division, groupe, equipe_domicile, equipe_exterieur, date_match').eq('id', id).maybeSingle();
  if (error || !data) { console.log(`  id=${id} : introuvable`); return; }
  const mj = await compterMj(id);
  console.log(`  id=${id} — ${data.date_match} — "${data.equipe_domicile}" vs "${data.equipe_exterieur}" — ${mj ? mj.length : '?'} ligne(s) matchs_joueur (${mj ? mj.filter((m) => m.minutes_jouees != null).length : '?'} avec minutes_jouees)`);
}

console.log('########## AS PTT Caen (groupe C) ##########');
await afficherLigne(855);
await afficherLigne(3346);

console.log('\n########## Aubervilliers (groupe E) ##########');
const { data: cal } = await supabase
  .from('calendrier_officiel')
  .select('id, equipe_domicile, equipe_exterieur, date_match')
  .eq('division', 'N2').eq('groupe', 'E').eq('saison', SAISON)
  .or('equipe_domicile.ilike.%aubervilliers%,equipe_exterieur.ilike.%aubervilliers%');
for (const c of cal || []) await afficherLigne(c.id);
