// Diagnostic (lecture seule) avant import de l'effectif FC Chambly Oise
// (capture Transfermarkt, saison 26/27) : détecte les doublons potentiels
// parmi les 22 joueurs listés avant toute écriture.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

function normaliser(str) {
  return (str || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

const EFFECTIF = [
  ['Yannick', 'Etile'], ['Simon', 'Pontdemé'], ['Sacha', 'Cortes'],
  ['Yanis', 'Klitim'], ['Thibault', 'Jaques'], ['Andrea', 'Marques'], ['Ababacar', 'Paye'],
  ['Rosario', 'Latouchent'], ['Anderson', 'Goncalves'],
  ['Sadia', 'Diakhabi'],
  ['Théo', 'Trinker'],
  ['Johan', 'Rotsen'], ['Léon', 'Delpech'], ['Alex', 'Diliberto'], ['Youri', 'Tabet'],
  ['Kemy', 'Amiche'], ['Edgar', 'Adam'],
  ['Billal', 'Mehadji'],
  ['Esteban', 'Gonçalves'],
  ['Noah', 'Randazzo'],
  ['Khalil', 'Gannoun'], ['Anthony', 'George'],
];

const { data: joueurs, error: jErr } = await supabase.from('joueurs').select('id, prenom, nom, club, niveau, poste');
if (jErr) { console.error('Erreur lecture joueurs :', jErr.message); process.exit(1); }

let doublons = 0;
for (const [prenom, nom] of EFFECTIF) {
  const np = normaliser(prenom), nn = normaliser(nom);
  const match = (joueurs || []).find((j) => normaliser(j.prenom) === np && normaliser(j.nom) === nn);
  if (match) {
    doublons++;
    console.log(`DOUBLON : ${prenom} ${nom} existe déjà (id=${match.id}, club actuel="${match.club}", niveau="${match.niveau}", poste="${match.poste}")`);
  }
}
console.log(`\n${doublons} doublon(s) potentiel(s) sur ${EFFECTIF.length} joueurs de l'effectif.`);
