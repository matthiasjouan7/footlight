// Corrige le champ "club" d'Imbad Ahamada, saisi comme "VFC La Roche-sur-Yon"
// à l'inscription (avant l'ajout des suggestions de club sur ce formulaire) :
// "vfc" n'est reconnu ni comme mot générique ni comme synonyme, donc ce nom
// ne correspondait à aucune ligne de calendrier_officiel (qui utilise "VENDEE
// FC LA ROCHE/YON") — "Générer mon calendrier" ne proposait donc que le match
// déjà lié manuellement, jamais les 33 autres journées de la saison.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);

const supabase = createClient(supabaseUrl, supabaseKey);
const JOUEUR_ID = '17c7ead5-f05a-49cc-81ad-b500e4c6891b';
const NOUVEAU_CLUB = 'La Roche-sur-Yon';

const { data: j, error: jErr } = await supabase.from('joueurs').select('id, prenom, nom, club').eq('id', JOUEUR_ID).single();
if (jErr) { console.error('Erreur lecture joueur :', jErr.message); process.exit(1); }
console.log(`Joueur : ${j.prenom} ${j.nom} | club actuel="${j.club}" -> nouveau club="${NOUVEAU_CLUB}"`);

if (!dryRun) {
  const { error: updErr } = await supabase.from('joueurs').update({ club: NOUVEAU_CLUB }).eq('id', JOUEUR_ID);
  if (updErr) { console.error('Erreur mise à jour :', updErr.message); process.exit(1); }
  console.log('Terminé.');
} else {
  console.log('DRY RUN : rien n\'a été modifié. Relancer avec DRY_RUN=false pour appliquer réellement.');
}
