// Diagnostic lecture seule : l'utilisateur signale que Steenvoorde (N2
// groupe D) et Riviera (N2 groupe G) restent incomplets. Vérifie l'état
// réel du calendrier et des matchs_joueur pour ces deux clubs, et repère
// un éventuel doublon calendrier (même pattern que Hyères/GFA RV et
// Alençon/Alençonnaise : deux graphies du même club réel non rapprochées).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const SAISON = '2026-2027';
const AUJOURD_HUI = new Date().toISOString().slice(0, 10);
function normalise(s) { return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }

async function analyseClub(division, groupe, motCle, clubJoueur) {
  console.log(`\n========== ${division} groupe ${groupe} — "${motCle}" ==========`);
  const { data: cal, error } = await supabase
    .from('calendrier_officiel')
    .select('id, date_match, journee, equipe_domicile, equipe_exterieur')
    .eq('saison', SAISON).eq('division', division).eq('groupe', groupe)
    .order('date_match');
  if (error) { console.error('Erreur calendrier :', error.message); return; }

  const matchs = (cal || []).filter((c) => normalise(c.equipe_domicile).includes(motCle) || normalise(c.equipe_exterieur).includes(motCle));
  console.log(`${matchs.length} match(s) calendrier trouvé(s) pour "${motCle}" :`);
  for (const m of matchs) {
    const { data: mj } = await supabase.from('matchs_joueur').select('id, minutes_jouees').eq('calendrier_officiel_id', m.id);
    const total = (mj || []).length;
    const avecMinutes = (mj || []).filter((x) => x.minutes_jouees != null).length;
    const statut = m.date_match > AUJOURD_HUI ? 'FUTUR' : 'passé';
    console.log(`  J${m.journee} ${m.date_match} (${statut}) — "${m.equipe_domicile}" vs "${m.equipe_exterieur}" (id=${m.id}) : ${avecMinutes}/${total} avec minutes`);
  }

  console.log('\n--- Vérification doublon éventuel (dates proches) ---');
  for (let i = 0; i < matchs.length; i++) {
    for (let j = i + 1; j < matchs.length; j++) {
      const a = matchs[i], b = matchs[j];
      const ecart = Math.abs((new Date(a.date_match) - new Date(b.date_match)) / 86400000);
      if (ecart <= 3 && a.journee === b.journee) {
        console.log(`  Possible doublon (même journée ${a.journee}) : id=${a.id} "${a.equipe_domicile}" vs "${a.equipe_exterieur}" (${a.date_match}) <-> id=${b.id} "${b.equipe_domicile}" vs "${b.equipe_exterieur}" (${b.date_match})`);
      }
    }
  }

  if (clubJoueur) {
    const { data: joueurs } = await supabase.from('joueurs').select('id, prenom, nom, club, matchs_joues').eq('saison', SAISON).eq('niveau', division).eq('club', clubJoueur);
    console.log(`\n--- Effectif "${clubJoueur}" côté joueurs ---`);
    console.log(`${(joueurs || []).length} joueur(s) trouvé(s).`);
    const parCompte = new Map();
    for (const j of joueurs || []) parCompte.set(j.matchs_joues, (parCompte.get(j.matchs_joues) || 0) + 1);
    for (const [c, n] of [...parCompte.entries()].sort((a, b) => a[0] - b[0])) console.log(`  matchs_joues=${c} : ${n} joueur(s)`);
  }
}

await analyseClub('N2', 'D', 'steenvoorde', null);
await analyseClub('N2', 'G', 'riviera', null);
await analyseClub('N2', 'G', 'foss', null);
