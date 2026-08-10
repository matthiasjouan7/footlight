// Diagnostic (lecture seule) : recherche par email exact généré pour
// chaque joueur de l'effectif Stade Rennais FC B, pour trouver la
// collision qui provoque "duplicate key value violates unique constraint
// joueurs_email_key" alors que le doublon-check (comparaison prenom+nom)
// n'a rien signalé.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

function normalizeName(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}
function slugifyName(s) {
  return normalizeName(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x';
}

const NOMS = [
  ['Ayoub', 'Akabou'], ['Noé', 'Le Page'], ['Yaël', 'Thébault'], ['Isiaka', 'Soukouna'],
  ['Ruben', 'Lomet'], ['Issa', 'Habri'], ['Junior', 'Ake'], ['Florian', 'Truffert'],
  ['Djibril', 'Diallo'], ['Chibuike', 'Ugochukwu'], ['Diego', 'Coutadeur'],
  ['Steeve', 'Mvodo Mvodo'], ['Mervin', 'Gbeme'], ['Henrick', 'Do Marcolino'],
  ['Melvin', 'Jambry'], ['Amadou', 'Diallo'], ['Steven', 'Gaote'], ['Mohamed', 'Chebbi'],
  ['Kelvin', 'Dongopandji'],
];

for (const [prenom, nom] of NOMS) {
  const email = `${slugifyName(prenom)}.${slugifyName(nom)}.manuel@scoute.footlight.fr`;
  const { data, error } = await supabase.from('joueurs').select('id, prenom, nom, club, niveau, poste, email').eq('email', email);
  if (error) { console.error(`Erreur pour ${prenom} ${nom} :`, error.message); continue; }
  if (data && data.length) {
    for (const d of data) {
      console.log(`COLLISION : ${prenom} ${nom} -> email="${email}" déjà utilisé par id=${d.id} (${d.prenom} ${d.nom}, club="${d.club}", niveau="${d.niveau}", poste="${d.poste}")`);
    }
  }
}
console.log('\nTerminé.');
