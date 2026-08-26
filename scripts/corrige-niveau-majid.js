// Corrige le niveau erroné d'Ahmed Majid (AS Cannes) : "N1" -> "Ligue 3"
// (23 autres joueurs AS Cannes ont déjà le bon niveau, confirmé par
// diagnostic-niveau-as-cannes.js — cas isolé, pas un problème de club).
// C'est ce mauvais niveau qui empêchait tout calendrier/stats de se
// générer pour lui (le rapprochement filtre par niveau).
// DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const JOUEUR_ID = '53ee77f0-aeaa-4e77-a8b0-8e4e4cba7335';

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
