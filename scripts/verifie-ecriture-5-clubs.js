// Vérification directe (lecture seule) de la persistance de l'écriture
// réalisée par corrige-5-clubs-n2-et-cherche-alencon.js : compte le total
// de matchs_joueur pour un échantillon de joueurs de chaque club corrigé.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const NIVEAU = 'N2';
const SAISON = '2026-2027';

const CLUBS = [
  { nom: 'Onet-le-Château Football', attendu: 26 },
  { nom: 'AS Trouville-Deauville-Villers', attendu: 26 },
  { nom: 'Les Sables Vendée Football', attendu: 26 },
  { nom: 'US Sainte-Anne de Vertou', attendu: 26 },
  { nom: 'FC Bourgoin-Jallieu', attendu: 26 },
];

for (const c of CLUBS) {
  const { data: joueurs, error: errJ } = await supabase.from('joueurs').select('id, prenom, nom').eq('club', c.nom).eq('niveau', NIVEAU).eq('saison', SAISON).limit(3);
  if (errJ) { console.log(`${c.nom} : erreur ${errJ.message}`); continue; }
  console.log(`\n=== ${c.nom} (échantillon de ${joueurs.length}) ===`);
  for (const j of joueurs) {
    const { count, error: errC } = await supabase.from('matchs_joueur').select('id', { count: 'exact', head: true }).eq('joueur_id', j.id);
    if (errC) { console.log(`  ${j.prenom} ${j.nom} : erreur ${errC.message}`); continue; }
    console.log(`  ${j.prenom} ${j.nom} : ${count} matchs_joueur (attendu ${c.attendu}) — ${count === c.attendu ? 'OK' : 'ÉCART'}`);
  }
}
