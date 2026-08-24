// Diagnostic lecture seule : cherche tous les joueurs dont le nom contient
// "Ouhammou" (accents/casse ignorés), pour vérifier le doublon signalé par
// l'utilisateur sur l'effectif Deauville (AS Trouville-Deauville-Villers).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const { data, error } = await supabase
  .from('joueurs')
  .select('id, prenom, nom, club, niveau, saison, email, created_at')
  .ilike('nom', '%ouhammou%');

if (error) { console.error('Erreur lecture joueurs :', error.message); process.exit(1); }

console.log(`${data?.length || 0} joueur(s) trouvé(s) avec "Ouhammou" dans le nom :`);
(data || []).forEach(j => console.log(`  ${j.prenom} ${j.nom} (id=${j.id}, club="${j.club}", niveau=${j.niveau}, saison=${j.saison}, email=${j.email}, créé le ${j.created_at})`));
