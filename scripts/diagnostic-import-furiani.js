// Diagnostic (lecture seule) avant import de l'effectif AS Furiani-Agliani
// (capture Transfermarkt, saison 26/27) : détecte les doublons potentiels
// parmi les 27 joueurs listés avant toute écriture.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

function normaliser(str) {
  return (str || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

const EFFECTIF = [
  ['Julien', 'Fabri'], ['Cédric', 'Lunardi'], ['Jean-Louis', 'Carlotti'], ['Iwan', 'Zaragoza'],
  ['Lilian', 'Chazelle'], ['Thibault', 'Valéry'], ['Othman', 'Aankour'], ['Arnaud', 'Binet'],
  ['Diego', 'Fantini'], ['Anthony', 'Féliciano'], ['Adrien', 'Pianelli'], ['Leandro', 'Alves'],
  ['Christophe', 'Vincent'], ['Audran', 'Ruiz'], ['Nicolas', 'Casanova'], ['Lucas', 'Rigaud'],
  ['Fabio', 'Teixeira Lopes'], ['Marc', 'Jourdan'], ['Mohamed', 'Conté'], ['Ayoub', 'Boukreris'],
  ['Soufiane', 'Nouala'], ['Peterson', 'Paul'], ['Axel', 'Thoumin'], ['Nicolas', 'Bertil'],
  ['Gwenn', 'Foulon'], ['Sébastien', 'da Silva'], ['Eghishe Antonio', 'Prodromou'],
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
