// Diagnostic lecture seule : Épinal (SAS Épinal) et Colmar (SR Colmar)
// n'ont AUCUNE ligne matchs_joueur (calendrier jamais généré), contrairement
// à Hyères/Limonest qui ont bien une ligne mais un score jamais synchronisé.
// Racing Club de France a une ligne (cal_id=8) mais score null — vérifie si
// c'est du N2 (exclu du cron/rattrapage actuels).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

// 1. Division/groupe du match Racing (cal_id=8)
const { data: cal8 } = await supabase.from('calendrier_officiel').select('*').eq('id', 8).single();
console.log('calendrier_officiel id=8 (Racing) :', JSON.stringify(cal8));

// 2. Cherche les lignes calendrier_officiel pour Épinal / Colmar (pour voir si le nom officiel existe)
for (const mot of ['pinal', 'colmar']) {
  const { data: cal } = await supabase
    .from('calendrier_officiel')
    .select('id, equipe_domicile, equipe_exterieur, division, groupe, journee, date_match')
    .eq('saison', '2026-2027')
    .or(`equipe_domicile.ilike.%${mot}%,equipe_exterieur.ilike.%${mot}%`)
    .order('date_match', { ascending: true })
    .limit(10);
  console.log(`\ncalendrier_officiel contenant "${mot}" :`);
  for (const r of cal || []) console.log(`  id=${r.id} | ${r.division} groupe=${r.groupe} journee=${r.journee} | ${r.date_match} | ${r.equipe_domicile} vs ${r.equipe_exterieur}`);
}

// 3. Niveau/division déclarés par les joueurs Épinal/Colmar eux-mêmes
const { data: joueursEpinalColmar } = await supabase
  .from('joueurs')
  .select('id, prenom, nom, club, niveau, saison')
  .in('club', ['SAS Épinal', 'SR Colmar'])
  .eq('saison', '2026-2027')
  .limit(6);
console.log('\nJoueurs Épinal/Colmar (club, niveau déclarés) :');
for (const j of joueursEpinalColmar || []) console.log(`  ${j.prenom} ${j.nom} | club="${j.club}" | niveau="${j.niveau}"`);
