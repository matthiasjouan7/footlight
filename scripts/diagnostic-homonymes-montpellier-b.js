// Vérification homonyme avant l'ajout de l'effectif Montpellier HSC B (N2
// groupe G, saison 2026-2027), demandé par l'utilisateur (capture d'écran
// "EFFECTIF MONTPELLIER HSC B", 25 joueurs).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const NOMS = ['Benedetto', 'Nya', 'Lamore', 'Tognarelli', 'Diallo', 'Lahmidini', 'Koné', 'El Ghazza', 'Ebener', 'Bamba Sarr', 'Chambon', 'Djemba Mbappé', 'El Azzouzi', 'Abderrebi', 'Gomis', 'Da Silva', 'Vidal-Cartoux', 'Épée Ngando', 'Raho-Moussa', 'Sidibé', 'El Mahboub', 'Diarra', 'Savin', 'Abdou', 'Bekkouche'];

console.log('Homonymes existants (club contenant "montpellier") :');
let nbConflitsClub = 0;
for (const nom of NOMS) {
  const motRecherche = nom.split(' ')[0].split('-')[0];
  const { data, error } = await supabase.from('joueurs').select('prenom, nom, club, niveau, saison').ilike('nom', `%${motRecherche}%`);
  if (error) { console.log(`  ${nom} : erreur ${error.message}`); continue; }
  const auClub = data.filter((j) => /montpellier/i.test(j.club || ''));
  if (auClub.length) {
    console.log(`  ${nom} : CONFLIT POSSIBLE AU CLUB —`);
    for (const j of auClub) console.log(`    ${j.prenom} ${j.nom} — club="${j.club}" niveau="${j.niveau}" saison="${j.saison}"`);
    nbConflitsClub++;
  }
}
console.log(`\n${nbConflitsClub} conflit(s) potentiel(s) au club Montpellier (à vérifier avant création).`);
