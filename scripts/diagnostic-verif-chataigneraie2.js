// Diagnostic lecture seule : la recherche ilike précédente (accent
// possiblement mal géré) a renvoyé 0 résultat malgré des joueurs
// visiblement déjà en base sous "AS La Châtaigneraie" (détectés par
// ajouter-effectif-chataigneraie.js). Cherche directement par nom exact
// des joueurs concernés pour lire leur champ club tel quel.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const NOMS = [
  ['Hugo', 'Bretaigne'], ['Mattéo', 'Cominges'], ['Servan', 'Suignard'],
  ['Lucas', 'Brémond'], ['Florian', 'Burgaud'], ['Andréa', 'Heckel'],
  ['Noah', 'Talbot'], ['Romuald', 'Marie'], ['Loan', 'Hochedez'],
  ['Mathis', 'Oger'], ['Bourhane', 'Conté'], ['Evan', 'Goret'],
  ['Lucas', 'Abreu'], ['Sascha', 'Touodop Tekeu'], ['Paul-Émile', 'Mimault'],
  ['Samuel', 'Biraud'], ['Pierre', 'Grellier'], ['Charles', 'Goyer'],
  ['Hugo', 'Bodin'], ['Bastien', 'Déchamps'],
];

for (const [prenom, nom] of NOMS) {
  const { data, error } = await supabase
    .from('joueurs')
    .select('id, prenom, nom, club, email, created_at')
    .eq('prenom', prenom)
    .eq('nom', nom);
  if (error) { console.error(`Erreur (${prenom} ${nom}) :`, error.message); continue; }
  if (!data || data.length === 0) {
    console.log(`${prenom} ${nom} : absent (recherche exacte).`);
  } else {
    for (const j of data) {
      console.log(`${prenom} ${nom} : id=${j.id}, club="${j.club}", email=${j.email}, créé le ${j.created_at}`);
    }
  }
}
