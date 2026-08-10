// Valide un profil joueur (profil_public: false -> true), équivalent au
// bouton "Valider" de footlight-admin.html mais scriptable.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const JOUEUR_ID = process.env.JOUEUR_ID;
const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!JOUEUR_ID) { console.error('JOUEUR_ID manquant.'); process.exit(1); }
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);

const supabase = createClient(supabaseUrl, supabaseKey);

const { data: j, error: jErr } = await supabase.from('joueurs').select('id, prenom, nom, club, profil_public').eq('id', JOUEUR_ID).single();
if (jErr) { console.error('Erreur lecture joueur :', jErr.message); process.exit(1); }

console.log(`${j.prenom} ${j.nom} (${j.club}) — profil_public actuel : ${j.profil_public}`);
if (j.profil_public) { console.log('Déjà public, rien à faire.'); process.exit(0); }

if (!dryRun) {
  const { error: updErr } = await supabase.from('joueurs').update({ profil_public: true }).eq('id', JOUEUR_ID);
  if (updErr) { console.error('Erreur mise à jour :', updErr.message); process.exit(1); }
  console.log('Terminé : profil_public = true.');
} else {
  console.log('DRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour valider réellement.');
}
