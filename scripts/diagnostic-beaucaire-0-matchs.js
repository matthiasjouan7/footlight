// Diagnostic lecture seule : pourquoi les joueurs "Beaucaire" sont à 0
// matchs. Couvre aussi "beaucairois"/"sbfc" (Stade Beaucairois FC, voir
// CLUB_MOTS_REMPLACEMENT: sbfc -> beaucairois, dans footlight-recherche.html).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const { data: joueurs, error: errJ } = await supabase
  .from('joueurs')
  .select('id, prenom, nom, club, niveau, saison, matchs_joues')
  .or('club.ilike.%beaucaire%,club.ilike.%sbfc%')
  .order('club').order('nom');
if (errJ) { console.error('Erreur joueurs :', errJ.message); process.exit(1); }

console.log(`${joueurs.length} joueur(s) "beaucaire"/"sbfc" (toutes divisions/saisons) :`);
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

console.log('\n########## Toutes les lignes calendrier_officiel "beaucaire"/"beaucairois"/"sbfc" (sans filtre date/division) ##########');
const { data: cal, error: errC } = await supabase
  .from('calendrier_officiel')
  .select('id, division, groupe, saison, equipe_domicile, equipe_exterieur, date_match')
  .or('equipe_domicile.ilike.%beaucaire%,equipe_exterieur.ilike.%beaucaire%,equipe_domicile.ilike.%sbfc%,equipe_exterieur.ilike.%sbfc%')
  .order('date_match');
if (errC) { console.error('Erreur calendrier :', errC.message); process.exit(1); }
console.log(`${cal.length} ligne(s) :`);
for (const c of cal) {
  const { data: mj } = await supabase.from('matchs_joueur').select('id, minutes_jouees, score_pour, score_contre').eq('calendrier_officiel_id', c.id);
  const avecMinutes = (mj || []).filter((m) => m.minutes_jouees != null).length;
  const score = mj && mj[0] ? `${mj[0].score_pour ?? '?'}-${mj[0].score_contre ?? '?'}` : '?-?';
  console.log(`  id=${c.id} — ${c.division} — groupe ${c.groupe} — saison ${c.saison} — ${c.date_match} — "${c.equipe_domicile}" vs "${c.equipe_exterieur}" — score ${score} — ${mj ? mj.length : 0} ligne(s) matchs_joueur (${avecMinutes} avec minutes_jouees)`);
}
