// Corrige le doublon calendrier_officiel du match SM Caen vs Valenciennes FC
// (Ligue 3, 2026-08-07) : deux lignes existent pour le même match car
// inséré par deux sources différentes avec un "groupe" différent ("Unique"
// vs "A"), ce qui empêchait nettoyer-doublons-calendrier.js (qui groupe par
// date+division+groupe+saison) de les voir comme doublons.
//
// Vérifie d'abord les liens matchs_joueur sur les deux lignes, puis supprime
// la plus récente (id 2774, groupe "A", sans lien) si elle n'a aucun lien —
// garde la ligne d'origine (id 1944, groupe "Unique") qui correspond au
// format utilisé par le reste du calendrier Ligue 3.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);

const supabase = createClient(supabaseUrl, supabaseKey);
const ID_ORIGINAL = 1944; // groupe "Unique", format du reste de la saison
const ID_DOUBLON = 2774;  // groupe "A", inséré plus tard

const { data: liens, error: liensErr } = await supabase
  .from('matchs_joueur')
  .select('id, joueur_id, calendrier_officiel_id')
  .in('calendrier_officiel_id', [ID_ORIGINAL, ID_DOUBLON]);
if (liensErr) { console.error('Erreur lecture matchs_joueur :', liensErr.message); process.exit(1); }

console.log(`Liens matchs_joueur trouvés : ${JSON.stringify(liens)}`);

const liensDoublon = (liens || []).filter((l) => String(l.calendrier_officiel_id) === String(ID_DOUBLON));
if (liensDoublon.length > 0) {
  console.log(`ARRÊT : la ligne id=${ID_DOUBLON} a ${liensDoublon.length} lien(s) matchs_joueur — revue manuelle nécessaire, rien ne sera supprimé.`);
  process.exit(0);
}

console.log(`${dryRun ? 'À supprimer' : 'Suppression'} : id=${ID_DOUBLON} (doublon sans lien).`);
if (!dryRun) {
  const { error: delErr } = await supabase.from('calendrier_officiel').delete().eq('id', ID_DOUBLON);
  if (delErr) { console.error('Erreur suppression :', delErr.message); process.exit(1); }
  console.log('Supprimé.');
} else {
  console.log('DRY RUN : rien n\'a été supprimé. Relancer avec DRY_RUN=false pour supprimer réellement.');
}
