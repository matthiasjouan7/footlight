// Met à jour le club de Dominique Pandor (id ci-dessous), transféré/prêté
// à Neuilly-sur-Marne (National 2, groupe E) — confirmé par l'utilisateur.
// Cible UNIQUEMENT par id, jamais par nom.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const ID = '34440f23-677e-463a-89b4-ff3aeee63c73';
const NOUVEAU_CLUB = 'Neuilly Marne S.F.C.';

const { data: joueur, error: errLecture } = await supabase
  .from('joueurs').select('id, prenom, nom, club').eq('id', ID).single();
if (errLecture) { console.error('Erreur lecture joueur :', errLecture.message); process.exit(1); }
console.log(`${joueur.prenom} ${joueur.nom} : club actuel "${joueur.club}" -> "${NOUVEAU_CLUB}"`);

if (!dryRun) {
  const { error: errMaj } = await supabase
    .from('joueurs').update({ club: NOUVEAU_CLUB }).eq('id', ID);
  if (errMaj) { console.log(`Erreur écriture : ${errMaj.message}`); process.exit(1); }
  console.log('Mis à jour.');
} else {
  console.log('DRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
}
