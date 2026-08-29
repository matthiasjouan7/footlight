// Diagnostic lecture seule : le diagnostic précédent a montré que
// certains joueurs de FC Limonest ont la journée 1 (2026-08-21 vs Hyères)
// en double dans matchs_joueur. Vérifie s'il existe maintenant 2 lignes
// calendrier_officiel distinctes pour ce même match (le rattrapage
// calendrier aurait pu recréer une ligne au lieu de reconnaître la ligne
// id=3136 déjà connue).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: cal, error: errC } = await supabase
    .from('calendrier_officiel')
    .select('id, equipe_domicile, equipe_exterieur, date_match, division, groupe, saison')
    .eq('date_match', '2026-08-21')
    .eq('division', 'N1').eq('groupe', 'C');
  if (errC) { console.error('Erreur calendrier :', errC.message); process.exitCode = 1; return; }
  console.log(`${cal.length} ligne(s) calendrier_officiel pour 2026-08-21 (N1 groupe C) :`);
  for (const r of cal) console.log(`  id=${r.id} | "${r.equipe_domicile}" vs "${r.equipe_exterieur}"`);

  const idsHyeresLimonest = cal.filter((r) => /limonest|hy[eè]res/i.test(r.equipe_domicile) || /limonest|hy[eè]res/i.test(r.equipe_exterieur)).map((r) => r.id);
  console.log(`\nIds Hyères/Limonest ce jour-là : ${idsHyeresLimonest.join(', ')}`);

  const { data: joueurs, error: errJ } = await supabase.from('joueurs').select('id, prenom, nom').eq('club', 'FC Limonest').eq('saison', '2026-2027');
  if (errJ) { console.error('Erreur joueurs :', errJ.message); process.exitCode = 1; return; }

  console.log('\n=== matchs_joueur du 2026-08-21 pour chaque joueur Limonest ===');
  for (const j of joueurs) {
    const { data: mj, error: errMj } = await supabase.from('matchs_joueur').select('id, calendrier_officiel_id, adversaire').eq('joueur_id', j.id).eq('date_match', '2026-08-21');
    if (errMj) { console.log(`${j.prenom} ${j.nom} : erreur ${errMj.message}`); continue; }
    if (mj.length > 1) {
      console.log(`⚠️  ${j.prenom} ${j.nom} (id=${j.id}) : ${mj.length} lignes pour le 2026-08-21 :`);
      for (const m of mj) console.log(`    matchs_joueur id=${m.id} calendrier_officiel_id=${m.calendrier_officiel_id} adversaire="${m.adversaire}"`);
    } else {
      console.log(`${j.prenom} ${j.nom} : ${mj.length} ligne(s) pour le 2026-08-21 (ok).`);
    }
  }
}

main().finally(() => process.exit(process.exitCode || 0));
