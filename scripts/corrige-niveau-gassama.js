// Corrige le niveau erroné de Dembo Gassama (FC Villefranche Beaujolais) :
// "N1" -> "Ligue 3" (même bug isolé qu'Ahmed Majid/AS Cannes — FC
// Villefranche Beaujolais est un adversaire confirmé de VFC La
// Roche-sur-Yon en Ligue 3 cette saison). C'est ce mauvais niveau qui
// empêchait tout calendrier/stats de se générer pour lui (0 ligne
// matchs_joueur, confirmé par diagnostic-bouhmidi-gassama.js).
// DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const JOUEUR_ID = 'bdeda88e-0c0c-4b66-83bd-79a94faaa7d5';

const { data: j, error: errJ } = await supabase.from('joueurs').select('prenom, nom, club, niveau').eq('id', JOUEUR_ID).single();
if (errJ) { console.error('Erreur :', errJ.message); process.exit(1); }
console.log(`${j.prenom} ${j.nom} (${j.club}) : niveau "${j.niveau}" -> "Ligue 3"`);

if (!dryRun) {
  const { error } = await supabase.from('joueurs').update({ niveau: 'Ligue 3' }).eq('id', JOUEUR_ID);
  if (error) { console.error('Erreur écriture :', error.message); process.exit(1); }
  console.log('Corrigé.');
} else {
  console.log('DRY RUN : rien n\'a été écrit.');
}
