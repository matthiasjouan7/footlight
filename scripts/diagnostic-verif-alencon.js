// Diagnostic lecture seule : la lecture anti-doublon d'ajouter-effectif-
// alencon.js (SELECT sans pagination sur la table joueurs, >2700 lignes,
// au-delà de la limite par défaut de 1000 lignes de PostgREST) a manqué
// la plupart des joueurs déjà en base pour US Alençon 61 — mêmes
// symptômes que pour AS La Châtaigneraie. Cherche par nom exact chacun
// des 21 joueurs de l'effectif pour lire leur état réel (club, id,
// date de création) avant toute action corrective.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const NOMS = [
  ['Arthur', 'Duval'], ['Aymeric', 'Potiron'], ['Joshua', 'Santini'],
  ['Karim', 'El Hamdaoui'], ['Nathan', 'Truet'], ['Samuel-Bill', 'Kamga'],
  ['Edgard', 'Nganga'], ['Lucas', 'Guéguen'], ['Joachim', 'Lepage'],
  ['William', 'Dayoro'], ['Lucas', 'Liger'], ['Maxence', 'Agnoly'],
  ['Ullrich', 'Pereira Souza'], ['Shelley', 'Bindika Ndalla'],
  ['Steve', 'Delacour'], ['Thibaud', 'Legrou'], ['Lorenzo', 'Guillier'],
  ['Hakim', 'El Hamdaoui'], ['Elyass', 'Dhoifirou'],
  ['Loukas', 'Lopes Marques'], ['Ayoub', 'Stiouet'],
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
