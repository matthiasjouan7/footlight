// Diagnostic (lecture seule) avant import de l'effectif US Créteil Football
// (capture Transfermarkt, saison 26/27) : vérifie (1) le nom/niveau officiel
// du club dans calendrier_officiel, pour renseigner un "club" reconnu par
// les suggestions, et (2) si des joueurs du même nom existent déjà en base,
// pour éviter les doublons.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

function normaliser(str) {
  return (str || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

console.log('=== Recherche "Créteil" dans calendrier_officiel ===');
const { data: calRows, error: calErr } = await supabase
  .from('calendrier_officiel')
  .select('division, groupe, saison, equipe_domicile, equipe_exterieur')
  .or('equipe_domicile.ilike.%creteil%,equipe_exterieur.ilike.%creteil%')
  .limit(20);
if (calErr) { console.error('Erreur :', calErr.message); process.exit(1); }
if (!calRows || !calRows.length) {
  console.log('Aucune ligne trouvée pour "Créteil" dans calendrier_officiel.');
} else {
  const noms = new Set();
  calRows.forEach((r) => {
    [r.equipe_domicile, r.equipe_exterieur].forEach((n) => { if (normaliser(n).includes('creteil')) noms.add(n); });
  });
  console.log(`Nom(s) officiel(s) trouvé(s) : ${[...noms].join(', ')}`);
  console.log(`Division/groupe/saison (exemple) : ${calRows[0].division} / ${calRows[0].groupe} / ${calRows[0].saison}`);
}

console.log('\n=== Vérification des doublons potentiels ===');
const EFFECTIF = [
  ['Hugo', 'Cointard'], ['Stanley', 'Kouamé'], ['Lucas', 'Camelot'], ['Zakaria', 'Belkouche'],
  ['Aboubacar', 'Magnora'], ['Axel', 'Rouquette'], ['Stephen', 'Quemper'], ['Ladji', 'Traoré'],
  ['Ahmad', 'Ngouyamsa'], ['Sidy', 'Diagne'], ['Nama', 'Fofana'], ['Nathanaël', 'Bai'],
  ['Adama', 'Niaka'], ['Adrien', 'Louveau'], ['Guillaume', 'Taty'], ['Ryan', 'Ferhaoui'],
  ['Liamine', 'Mokdad'], ['Tommy', 'Iva'], ['Jason', 'Mbock'], ['Yanick', 'Aguemon'],
  ['Abdeldjalil', 'Hachem'], ['Ylan', 'Gomes'], ['Arsène', 'Elogo'], ['Yann', 'Diebold'],
  ['Nouha', 'Dicko'], ['Léo', 'Bouchet'], ['Romain', 'Montiel'], ['Mohamed', 'Ben Fredj'],
  ['Ibtoihi', 'Hadari'], ['Youssef', 'Boujenfa'],
];

const { data: joueurs, error: jErr } = await supabase.from('joueurs').select('id, prenom, nom, club, niveau, poste');
if (jErr) { console.error('Erreur lecture joueurs :', jErr.message); process.exit(1); }

let doublons = 0;
for (const [prenom, nom] of EFFECTIF) {
  const np = normaliser(prenom), nn = normaliser(nom);
  const match = (joueurs || []).find((j) => normaliser(j.prenom) === np && normaliser(j.nom) === nn);
  if (match) {
    doublons++;
    console.log(`  DOUBLON : ${prenom} ${nom} existe déjà (id=${match.id}, club actuel="${match.club}", niveau="${match.niveau}", poste="${match.poste}")`);
  }
}
console.log(`\n${doublons} doublon(s) potentiel(s) sur ${EFFECTIF.length} joueurs de l'effectif.`);
