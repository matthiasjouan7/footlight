// Diagnostic lecture seule : pourquoi les joueurs "Nancy" sont à 0 matchs.
// Vérifie, pour chaque club FootLight contenant "nancy" (toutes divisions,
// saison en cours), l'état matchs_joues des joueurs, l'existence d'un
// calendrier_officiel correspondant, et les lignes matchs_joueur déjà
// rattachées à ce calendrier.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const SAISON = '2026-2027';

const { data: joueurs, error: errJ } = await supabase
  .from('joueurs')
  .select('id, prenom, nom, club, niveau, saison, matchs_joues')
  .ilike('club', '%nancy%')
  .order('club').order('nom');
if (errJ) { console.error('Erreur joueurs :', errJ.message); process.exit(1); }

console.log(`${joueurs.length} joueur(s) "nancy" (toutes divisions/saisons) :`);
const parClub = new Map();
for (const j of joueurs) {
  const clef = `${j.club} | ${j.niveau} | ${j.saison}`;
  if (!parClub.has(clef)) parClub.set(clef, []);
  parClub.get(clef).push(j);
}
for (const [clef, liste] of parClub) {
  const avecMatch = liste.filter((j) => (j.matchs_joues || 0) > 0).length;
  console.log(`\n  "${clef}" — ${liste.length} joueur(s), ${avecMatch} avec matchs_joues > 0`);
}

for (const [clef] of parClub) {
  const [club, niveau, saison] = clef.split(' | ');
  console.log(`\n########## Calendrier pour "${club}" (${niveau}, ${saison}) ##########`);
  const { data: cal, error: errC } = await supabase
    .from('calendrier_officiel')
    .select('id, division, groupe, equipe_domicile, equipe_exterieur, date_match, score_domicile, score_exterieur')
    .eq('division', niveau).eq('saison', saison)
    .or('equipe_domicile.ilike.%nancy%,equipe_exterieur.ilike.%nancy%')
    .order('date_match');
  if (errC) { console.error('  Erreur calendrier :', errC.message); continue; }
  if (!cal || cal.length === 0) { console.log('  Aucune ligne calendrier_officiel trouvée contenant "nancy".'); continue; }
  for (const c of cal) {
    const { data: mj } = await supabase.from('matchs_joueur').select('id, minutes_jouees').eq('calendrier_officiel_id', c.id);
    const avecMinutes = (mj || []).filter((m) => m.minutes_jouees != null).length;
    console.log(`  id=${c.id} — ${c.date_match} — groupe ${c.groupe} — "${c.equipe_domicile}" vs "${c.equipe_exterieur}" — score ${c.score_domicile ?? '?'}-${c.score_exterieur ?? '?'} — ${mj ? mj.length : 0} ligne(s) matchs_joueur (${avecMinutes} avec minutes_jouees)`);
  }
}
