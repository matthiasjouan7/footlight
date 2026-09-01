// Diagnostic lecture seule : l'utilisateur signale que des joueurs
// "PTT Caen" et "Aubervilliers" sont bien inscrits sur FootLight en
// National 2, alors que diagnostic-fff-n2-joueurs-manquants.js les liste
// comme manquants sous les noms FFF "As Ptt Caen 1" / "Aubervilliers Fcm
// 1" — même classe de faux positif que le cas Alès (rapprochement club
// en échec, pas une vraie absence). Liste les valeurs exactes de
// joueurs.club et calendrier_officiel.equipe_* pour comprendre l'écart
// de nommage.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const SAISON = '2026-2027';
const MOTS_CLES = ['caen', 'aubervilliers'];

for (const mot of MOTS_CLES) {
  console.log(`\n########## "${mot}" ##########`);
  const { data: joueurs, error: errJ } = await supabase
    .from('joueurs')
    .select('id, prenom, nom, club, niveau')
    .eq('saison', SAISON)
    .ilike('club', `%${mot}%`);
  if (errJ) { console.error('Erreur joueurs :', errJ.message); process.exit(1); }
  console.log(`${joueurs.length} joueur(s) avec "${mot}" dans le club (toutes divisions, saison ${SAISON}) :`);
  const parClub = new Map();
  for (const j of joueurs) {
    if (!parClub.has(j.club)) parClub.set(j.club, { niveau: j.niveau, n: 0 });
    parClub.get(j.club).n++;
  }
  for (const [club, info] of parClub.entries()) console.log(`  "${club}" (niveau ${info.niveau}) : ${info.n} joueur(s)`);

  const { data: cal, error: errC } = await supabase
    .from('calendrier_officiel')
    .select('division, groupe, equipe_domicile, equipe_exterieur')
    .eq('saison', SAISON)
    .or(`equipe_domicile.ilike.%${mot}%,equipe_exterieur.ilike.%${mot}%`)
    .limit(500);
  if (errC) { console.error('Erreur calendrier_officiel :', errC.message); process.exit(1); }
  const equipesCal = new Set();
  for (const c of cal) {
    if (new RegExp(mot, 'i').test(c.equipe_domicile)) equipesCal.add(`${c.equipe_domicile} (${c.division}${c.groupe ? '/' + c.groupe : ''})`);
    if (new RegExp(mot, 'i').test(c.equipe_exterieur)) equipesCal.add(`${c.equipe_exterieur} (${c.division}${c.groupe ? '/' + c.groupe : ''})`);
  }
  console.log(`\n${equipesCal.size} équipe(s) distincte(s) "${mot}" dans calendrier_officiel :`);
  [...equipesCal].sort().forEach((e) => console.log(`  ${e}`));
}
