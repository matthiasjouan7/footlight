// Diagnostic (lecture seule) : vérifie les stats des buteurs cités pour la
// vidéo "fin de la 1re journée de Ligue 3", avant de générer le contenu.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

function normaliser(str) {
  return (str || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

const NOMS_RECHERCHES = ['khoumisti', 'samb', 'legendre'];

const { data: joueurs, error } = await supabase.from('joueurs').select('*');
if (error) { console.error('Erreur lecture joueurs :', error.message); process.exit(1); }

for (const recherche of NOMS_RECHERCHES) {
  const candidats = (joueurs || []).filter((j) => normaliser(j.nom).includes(recherche));
  console.log(`\n=== Recherche "${recherche}" : ${candidats.length} résultat(s) ===`);
  for (const j of candidats) {
    console.log(`  ${j.prenom} ${j.nom} (id=${j.id}) | poste="${j.poste}" club="${j.club}" niveau="${j.niveau}"`);
    console.log(`    Total saison : buts=${j.buts} matchs_joues=${j.matchs_joues} minutes_jouees=${j.minutes_jouees}`);
    const { data: matchs } = await supabase.from('matchs_joueur').select('date_match, adversaire, buts, minutes_jouees, titulaire').eq('joueur_id', j.id).not('minutes_jouees', 'is', null).order('date_match', { ascending: true });
    for (const m of matchs || []) {
      console.log(`    Match joué : date=${m.date_match} adversaire="${m.adversaire}" buts=${m.buts} minutes=${m.minutes_jouees} titulaire=${m.titulaire}`);
    }
  }
}
