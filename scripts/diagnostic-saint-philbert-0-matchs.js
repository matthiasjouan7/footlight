// Diagnostic lecture seule : pourquoi les joueurs "Saint-Philbert" sont
// à 0 matchs. Même vérification que diagnostic-nancy-0-matchs.js. Couvre
// aussi "philibert" (variante orthographique connue, voir
// CLUB_MOTS_REMPLACEMENT dans footlight-recherche.html).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const { data: joueurs, error: errJ } = await supabase
  .from('joueurs')
  .select('id, prenom, nom, club, niveau, saison, matchs_joues')
  .or('club.ilike.%philbert%,club.ilike.%philibert%')
  .order('club').order('nom');
if (errJ) { console.error('Erreur joueurs :', errJ.message); process.exit(1); }

console.log(`${joueurs.length} joueur(s) "philbert/philibert" (toutes divisions/saisons) :`);
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
    .select('id, division, groupe, equipe_domicile, equipe_exterieur, date_match')
    .eq('division', niveau).eq('saison', saison)
    .or('equipe_domicile.ilike.%philbert%,equipe_exterieur.ilike.%philbert%,equipe_domicile.ilike.%philibert%,equipe_exterieur.ilike.%philibert%')
    .order('date_match');
  if (errC) { console.error('  Erreur calendrier :', errC.message); continue; }
  if (!cal || cal.length === 0) { console.log('  Aucune ligne calendrier_officiel trouvée contenant "philbert"/"philibert".'); continue; }
  for (const c of cal) {
    const { data: mj } = await supabase.from('matchs_joueur').select('id, minutes_jouees, score_pour, score_contre').eq('calendrier_officiel_id', c.id);
    const avecMinutes = (mj || []).filter((m) => m.minutes_jouees != null).length;
    const score = mj && mj[0] ? `${mj[0].score_pour ?? '?'}-${mj[0].score_contre ?? '?'}` : '?-?';
    console.log(`  id=${c.id} — ${c.date_match} — groupe ${c.groupe} — "${c.equipe_domicile}" vs "${c.equipe_exterieur}" — score ${score} — ${mj ? mj.length : 0} ligne(s) matchs_joueur (${avecMinutes} avec minutes_jouees)`);
  }
}
