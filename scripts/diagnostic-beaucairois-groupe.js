// Diagnostic lecture seule : trouve le groupe N2 exact de Stade
// Beaucairois 30 (absent de la liste groupe G vue précédemment pour OM B/
// Saint-Étienne B/Montpellier B) et vérifie les homonymes pour son
// effectif (24 joueurs, capture d'écran "EFFECTIF STADE BEAUCAIROIS 30").
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const { data: officiel, error: errO } = await supabase
  .from('calendrier_officiel')
  .select('equipe_domicile, equipe_exterieur, division, groupe')
  .eq('saison', '2026-2027')
  .or('equipe_domicile.ilike.%beaucair%,equipe_exterieur.ilike.%beaucair%');
if (errO) { console.error('Erreur calendrier :', errO.message); process.exit(1); }
const vus = new Set();
for (const r of officiel) {
  const nom = [r.equipe_domicile, r.equipe_exterieur].find((n) => /beaucair/i.test(n));
  const cle = `${nom}|${r.division}|${r.groupe}`;
  if (vus.has(cle)) continue;
  vus.add(cle);
  console.log(`  "${nom}" — division=${r.division} groupe=${r.groupe}`);
}
if (!officiel.length) console.log('  Aucune ligne "beaucair" trouvée dans calendrier_officiel.');

const NOMS = ['Yattara', 'Hernandez', 'Souaré', 'Kalil Traoré', 'Bonalair', 'Matondo', 'Tamas', 'Convertini', 'Baury', 'El Gourari', 'Kouakou', 'Khadraoui', 'Haidar Bacar', 'Sadibou Dia', 'Diallo', 'Alaoui', 'Boughazi', 'Bah', 'Zerdoum', 'Ferraz', 'Daoudi', 'Tshiakayembe', 'Kapitza', 'Tall'];
console.log('\nHomonymes existants (club contenant "beaucair") :');
let nbConflits = 0;
for (const nom of NOMS) {
  const motRecherche = nom.split(' ')[0];
  const { data, error } = await supabase.from('joueurs').select('prenom, nom, club, niveau, saison').ilike('nom', `%${motRecherche}%`);
  if (error) { console.log(`  ${nom} : erreur ${error.message}`); continue; }
  const auClub = data.filter((j) => /beaucair/i.test(j.club || ''));
  if (auClub.length) {
    console.log(`  ${nom} : CONFLIT POSSIBLE —`);
    for (const j of auClub) console.log(`    ${j.prenom} ${j.nom} — club="${j.club}" niveau="${j.niveau}" saison="${j.saison}"`);
    nbConflits++;
  }
}
console.log(`\n${nbConflits} conflit(s) potentiel(s).`);
