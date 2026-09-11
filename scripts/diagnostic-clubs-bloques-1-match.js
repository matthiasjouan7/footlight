// Diagnostic lecture seule : l'utilisateur signale que Balagne, Rodez et
// Colomiers restaient bloqués à 1 match joué malgré plusieurs journées
// disputées. Vérifie l'état actuel (après les correctifs Transfermarkt du
// jour) pour ces clubs : nombre de joueurs par valeur de matchs_joues.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const SAISON = '2026-2027';
const CLUBS_A_VERIFIER = ['balagne', 'rodez', 'colomiers'];

const { data: joueurs, error } = await supabase
  .from('joueurs')
  .select('id, prenom, nom, club, matchs_joues')
  .eq('niveau', 'N2').eq('saison', SAISON);
if (error) { console.error('Erreur :', error.message); process.exit(1); }

function normalise(s) { return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }

for (const motCle of CLUBS_A_VERIFIER) {
  const joueursClub = (joueurs || []).filter((j) => normalise(j.club).includes(motCle));
  const clubsDistincts = [...new Set(joueursClub.map((j) => j.club))];
  console.log(`\n########## "${motCle}" (${clubsDistincts.join(', ')}) — ${joueursClub.length} joueur(s) ##########`);
  const parMatchsJoues = new Map();
  for (const j of joueursClub) {
    const n = j.matchs_joues ?? 0;
    if (!parMatchsJoues.has(n)) parMatchsJoues.set(n, []);
    parMatchsJoues.get(n).push(`${j.prenom} ${j.nom}`);
  }
  for (const [n, noms] of [...parMatchsJoues.entries()].sort((a, b) => a[0] - b[0])) {
    console.log(`  ${n} match(s) joué(s) : ${noms.length} joueur(s)${n <= 1 ? ' -> ' + noms.slice(0, 8).join(', ') + (noms.length > 8 ? '...' : '') : ''}`);
  }
}
