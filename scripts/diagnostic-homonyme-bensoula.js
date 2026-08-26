// Diagnostic lecture seule : vérifie si un joueur nommé Bensoula (ou
// homonyme) existe déjà en base avant d'ajouter la fiche de Kamil Bensoula
// (VFC La Roche-sur-Yon, Ligue 3, saison 2026-2027).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const { data, error } = await supabase
  .from('joueurs')
  .select('id, prenom, nom, club, niveau, saison, date_naissance, nationalite, email')
  .ilike('nom', '%bensoula%');
if (error) { console.error('Erreur :', error.message); process.exit(1); }
console.log(`${data.length} résultat(s) pour "bensoula" :`);
for (const j of data) console.log(JSON.stringify(j));

// Vérifie aussi que le club existe bien tel quel en base (autres joueurs).
const { data: clubJoueurs, error: err2 } = await supabase
  .from('joueurs')
  .select('id, prenom, nom, club, niveau, saison')
  .ilike('club', '%roche%yon%')
  .limit(10);
if (err2) { console.error('Erreur club :', err2.message); process.exit(1); }
console.log(`\n${clubJoueurs.length} joueur(s) échantillon pour le club (contient "roche" et "yon") :`);
for (const j of clubJoueurs) console.log(JSON.stringify(j));
