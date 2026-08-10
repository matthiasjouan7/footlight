// Diagnostic (lecture seule) : profil et fiches de match (matchs_joueur)
// d'un joueur donné par son id, pour comprendre pourquoi ses stats ne se
// remplissent jamais malgré "Générer mon calendrier" utilisé.
import { createClient } from '@supabase/supabase-js';

const JOUEUR_ID = process.env.JOUEUR_ID;
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!JOUEUR_ID) { console.error('JOUEUR_ID manquant.'); process.exit(1); }
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

const { data: j, error: jErr } = await supabase.from('joueurs').select('*').eq('id', JOUEUR_ID).single();
if (jErr) { console.error('Erreur lecture joueur :', jErr.message); process.exit(1); }
console.log('Profil joueur :');
console.log(`  prenom="${j.prenom}" nom="${j.nom}" club="${j.club}" niveau="${j.niveau}" saison="${j.saison}"`);

const { data: matchs, error: mErr } = await supabase
  .from('matchs_joueur')
  .select('*')
  .eq('joueur_id', JOUEUR_ID)
  .order('date_match', { ascending: true });
if (mErr) { console.error('Erreur lecture matchs_joueur :', mErr.message); process.exit(1); }

console.log(`\n${matchs.length} match(s) en base pour ce joueur :`);
for (const m of matchs) {
  console.log(`  id=${m.id} | saison="${m.saison}" | date=${m.date_match} | adversaire="${m.adversaire}" | domicile=${m.domicile} | calendrier_officiel_id=${m.calendrier_officiel_id} | buts=${m.buts} | minutes_jouees=${m.minutes_jouees}`);
}

// Comparaison avec la ligne calendrier_officiel du 1er match, si elle existe.
if (matchs.length) {
  const { data: calRow, error: calErr } = await supabase
    .from('calendrier_officiel')
    .select('*')
    .eq('id', matchs[0].calendrier_officiel_id)
    .maybeSingle();
  console.log(`\nLigne calendrier_officiel correspondante (id=${matchs[0].calendrier_officiel_id}) :`);
  if (calErr) console.log(`  Erreur : ${calErr.message}`);
  else if (!calRow) console.log('  Introuvable (calendrier_officiel_id orphelin).');
  else console.log(`  domicile="${calRow.equipe_domicile}" | exterieur="${calRow.equipe_exterieur}" | date=${calRow.date_match} | division="${calRow.division}" | groupe="${calRow.groupe}" | saison=${calRow.saison}`);
}
