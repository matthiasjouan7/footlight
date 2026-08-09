// Corrige le club des joueurs importés sous "FR Haguenau" : le calendrier
// officiel (calendrier_officiel) utilise "FCSR HAGUENAU" (FC Sportive et
// Réunie Haguenau) — "fr" et "fcsr" sont deux mots distincts pour le
// rapprochement flou de sync-lequipe-to-calendrier.js, donc "FR Haguenau" ne
// matchait aucune ligne de calendrier. Renomme en "FCSR Haguenau".
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);

const supabase = createClient(supabaseUrl, supabaseKey);

const ANCIEN_CLUB = 'FR Haguenau';
const NOUVEAU_CLUB = 'FCSR Haguenau';

const { data: joueurs, error: jErr } = await supabase.from('joueurs').select('id, prenom, nom, club').eq('club', ANCIEN_CLUB);
if (jErr) { console.error('Erreur lecture joueurs :', jErr.message); process.exit(1); }

console.log(`${(joueurs || []).length} joueur(s) à corriger ("${ANCIEN_CLUB}" -> "${NOUVEAU_CLUB}") :`);
for (const j of joueurs || []) console.log(`  ${j.prenom} ${j.nom} (id=${j.id})`);

if (!dryRun) {
  const { error: updErr } = await supabase.from('joueurs').update({ club: NOUVEAU_CLUB }).eq('club', ANCIEN_CLUB);
  if (updErr) { console.error('Erreur mise à jour :', updErr.message); process.exit(1); }
  console.log('\nTerminé.');
} else {
  console.log('\nDRY RUN : rien n\'a été modifié. Relancer avec DRY_RUN=false pour appliquer réellement.');
}
