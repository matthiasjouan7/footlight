// Diagnostic (lecture seule) : profil et fiches de match de Robin Legendre,
// pour rattraper manuellement le total de saison qui n'a pas bénéficié du
// calcul automatique (fiche enregistrée avant le correctif de répercussion
// fiche -> total de saison).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

function normaliser(str) {
  return (str || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

const { data: joueurs, error } = await supabase.from('joueurs').select('*');
if (error) { console.error('Erreur lecture joueurs :', error.message); process.exit(1); }

const candidats = (joueurs || []).filter((j) =>
  normaliser(j.prenom).includes('robin') && normaliser(j.nom).includes('legendre')
);

if (!candidats.length) {
  console.log('Aucun joueur "Robin Legendre" trouvé.');
  process.exit(0);
}

for (const j of candidats) {
  console.log(`\n=== ${j.prenom} ${j.nom} (id=${j.id}) ===`);
  console.log(`  club="${j.club}" niveau="${j.niveau}" saison="${j.saison}"`);
  console.log(`  Total saison actuel : matchs_joues=${j.matchs_joues} titularisations=${j.titularisations} matchs_remplacant=${j.matchs_remplacant} buts=${j.buts} passes_decisives=${j.passes_decisives} minutes_jouees=${j.minutes_jouees} cartons_jaunes=${j.cartons_jaunes} cartons_rouges=${j.cartons_rouges} buts_encaisses_avec=${j.buts_encaisses_avec} clean_sheets=${j.clean_sheets}`);

  const { data: matchs } = await supabase.from('matchs_joueur').select('*').eq('joueur_id', j.id).order('date_match', { ascending: true });
  console.log(`  ${matchs?.length || 0} fiche(s) de match :`);
  for (const m of matchs || []) {
    console.log(`    id=${m.id} | saison="${m.saison}" | date=${m.date_match} | adversaire="${m.adversaire}" | titulaire=${m.titulaire} | buts=${m.buts} | passes=${m.passes_decisives} | minutes=${m.minutes_jouees} | cartj=${m.cartons_jaunes} | cartr=${m.cartons_rouges} | encaisses=${m.buts_encaisses_avec} | clean_sheet=${m.clean_sheet}`);
  }
}
