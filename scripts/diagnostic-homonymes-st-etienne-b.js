// Vérification homonyme avant l'ajout de l'effectif AS Saint-Étienne B (N2
// groupe G, saison 2026-2027), demandé par l'utilisateur (capture d'écran
// "EFFECTIF AS SAINT-ÉTIENNE B", 16 joueurs).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const NOMS = ['Houngbo Civier', 'Derache', 'Mbambi', 'Benkou', 'Sissoko', 'Depalle', 'Eymard', 'Lutin Zidee', 'Moulin', 'Agesilas', 'Ben Tiba', 'Cheikh', 'Sonko', 'Konté', 'Zibi', 'Reynaud'];

console.log('Homonymes existants (club="As St Etienne 2") :');
let nbConflitsClub = 0;
for (const nom of NOMS) {
  const motRecherche = nom.split(' ')[0];
  const { data, error } = await supabase.from('joueurs').select('prenom, nom, club, niveau, saison').ilike('nom', `%${motRecherche}%`);
  if (error) { console.log(`  ${nom} : erreur ${error.message}`); continue; }
  const auClub = data.filter((j) => /st.?etienne/i.test(j.club || ''));
  if (auClub.length) {
    console.log(`  ${nom} : CONFLIT POSSIBLE AU CLUB —`);
    for (const j of auClub) console.log(`    ${j.prenom} ${j.nom} — club="${j.club}" niveau="${j.niveau}" saison="${j.saison}"`);
    nbConflitsClub++;
  }
}
console.log(`\n${nbConflitsClub} conflit(s) potentiel(s) au club Saint-Étienne (à vérifier avant création).`);
