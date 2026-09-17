// Diagnostic lecture seule : signalement utilisateur — sur la page recherche
// (footlight-recherche.html), le slider "Matchs joués minimum" réglé sur 2
// ne renverrait que des joueurs à partir de 3 matchs joués.
//
// Relecture du code (footlight-recherche.html) : le filtre est
// `if ((j.matchs_joues||0) < minMatchs) return false;` — un joueur à
// matchs_joues=2 avec minMatchs=2 est bien conservé (2<2 est faux). La
// requête de chargement pagine déjà avec .range() (PAGE_SIZE=1000) pour ne
// pas tronquer silencieusement les joueurs loin dans le tri. Sur le papier,
// aucun bug de logique trouvé.
//
// Ce script vérifie donc la piste "donnée" plutôt que "logique JS" :
// reproduit exactement la requête de chargement de footlight-recherche.html
// (profil_public=true, pagination .range()) puis simule le filtre JS tel
// quel côté Node, pour voir si des joueurs à matchs_joues=2 existent
// réellement et si le filtre les exclut à tort.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const PAGE_SIZE = 1000;
let all = [];
for (let from = 0; ; from += PAGE_SIZE) {
  const { data, error } = await supabase
    .from('joueurs')
    .select('id,prenom,nom,poste,club,niveau,matchs_joues,profil_public')
    .eq('profil_public', true)
    .order('matchs_joues', { ascending: false })
    .order('id', { ascending: true })
    .range(from, from + PAGE_SIZE - 1);
  if (error) { console.error('Erreur :', error.message); process.exit(1); }
  if (!data || !data.length) break;
  all = all.concat(data);
  if (data.length < PAGE_SIZE) break;
}
console.log(`${all.length} joueur(s) profil_public=true chargés (comme le ferait footlight-recherche.html).\n`);

console.log('--- Répartition par matchs_joues (0 à 10) ---');
const parCompte = new Map();
for (const j of all) parCompte.set(j.matchs_joues ?? 0, (parCompte.get(j.matchs_joues ?? 0) || 0) + 1);
for (let n = 0; n <= 10; n++) {
  console.log(`  matchs_joues=${n} : ${parCompte.get(n) || 0} joueur(s)`);
}

console.log('\n--- Simulation exacte du filtre JS pour minMatchs=2 ---');
const minMatchs = 2;
const filtres = all.filter((j) => !((j.matchs_joues || 0) < minMatchs));
console.log(`${filtres.length} joueur(s) passent le filtre minMatchs=2 (sur ${all.length}).`);
const avecExactement2 = filtres.filter((j) => (j.matchs_joues || 0) === 2);
console.log(`  dont ${avecExactement2.length} avec exactement matchs_joues=2.`);
if (avecExactement2.length) {
  console.log('  Exemples :');
  for (const j of avecExactement2.slice(0, 5)) console.log(`    ${j.prenom} ${j.nom} (${j.club}, ${j.niveau})`);
} else {
  console.log('  Aucun joueur à exactement 2 matchs (profil_public=true) : le filtre ne peut mathématiquement pas en afficher, ce n\'est pas un bug de logique mais une absence de donnée.');
}

console.log('\n--- Total joueurs (toutes valeurs profil_public confondues) à matchs_joues=2, pour comparaison ---');
let allSansFiltre = [];
for (let from = 0; ; from += PAGE_SIZE) {
  const { data, error } = await supabase
    .from('joueurs').select('id,prenom,nom,club,niveau,profil_public,matchs_joues')
    .eq('matchs_joues', 2)
    .range(from, from + PAGE_SIZE - 1);
  if (error) { console.error('Erreur :', error.message); break; }
  if (!data || !data.length) break;
  allSansFiltre = allSansFiltre.concat(data);
  if (data.length < PAGE_SIZE) break;
}
console.log(`${allSansFiltre.length} joueur(s) au total (tous profils) ont matchs_joues=2.`);
const publics = allSansFiltre.filter((j) => j.profil_public);
console.log(`  dont ${publics.length} avec profil_public=true.`);
if (allSansFiltre.length && !publics.length) {
  console.log('  => Ces joueurs existent mais ont profil_public=false : ils sont donc invisibles côté recherche publique, quel que soit le filtre matchs.');
}
