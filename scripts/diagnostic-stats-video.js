// Diagnostic (lecture seule) : stats actuelles de Matthieu Villette et Imbad
// Ahamada (La Roche-sur-Yon), pour rédiger un contenu vidéo court basé sur de
// vraies données plutôt que des chiffres inventés.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);
const JOUEURS = {
  Villette: 'e58e3d5b-4fa9-48b9-8918-37d92e270f22',
  Imbad: '17c7ead5-f05a-49cc-81ad-b500e4c6891b',
};

for (const [label, id] of Object.entries(JOUEURS)) {
  const { data: j, error: jErr } = await supabase.from('joueurs').select('*').eq('id', id).single();
  if (jErr) { console.error(`Erreur lecture ${label} :`, jErr.message); continue; }
  console.log(`\n=== ${label} (${j.prenom} ${j.nom}) ===`);
  console.log(`  poste="${j.poste}" club="${j.club}" niveau="${j.niveau}"`);
  console.log(`  buts=${j.buts} passes_decisives=${j.passes_decisives} matchs_joues=${j.matchs_joues} clean_sheets=${j.clean_sheets}`);

  const { data: matchs } = await supabase.from('matchs_joueur').select('*').eq('joueur_id', id).order('date_match', { ascending: true });
  const joues = (matchs || []).filter(m => m.score_domicile !== null && m.score_domicile !== undefined || m.buts !== null && m.minutes_jouees);
  console.log(`  ${matchs?.length || 0} fiche(s) de match en base`);
  for (const m of matchs || []) {
    console.log(`    date=${m.date_match} adversaire="${m.adversaire}" buts=${m.buts} clean_sheet=${m.clean_sheet} minutes=${m.minutes_jouees} verifie=${m.verifie}`);
  }
}
