// Consolide le doublon calendrier_officiel La Roche-sur-Yon vs Versailles
// (2026-08-07, Ligue 3) : deux joueurs différents ont chacun un match lié à
// l'une des deux lignes en double (id 1942 "Unique", id 2777 "A"). Re-attache
// le match du second joueur vers la ligne d'origine (1942), puis supprime la
// ligne en double (2777) — sans perte de données pour aucun des deux joueurs.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);

const supabase = createClient(supabaseUrl, supabaseKey);
const ID_ORIGINAL = 1942;
const ID_DOUBLON = 2777;

const { data: liens, error: liensErr } = await supabase
  .from('matchs_joueur')
  .select('id, joueur_id, calendrier_officiel_id')
  .in('calendrier_officiel_id', [ID_ORIGINAL, ID_DOUBLON]);
if (liensErr) { console.error('Erreur lecture matchs_joueur :', liensErr.message); process.exit(1); }

console.log(`Liens trouvés : ${JSON.stringify(liens)}`);

const aReattacher = (liens || []).filter((l) => String(l.calendrier_officiel_id) === String(ID_DOUBLON));
if (!aReattacher.length) {
  console.log('Aucun lien à ré-attacher sur la ligne en doublon — rien à faire côté matchs_joueur.');
} else {
  for (const l of aReattacher) {
    console.log(`${dryRun ? 'À ré-attacher' : 'Ré-attachement'} : matchs_joueur.id=${l.id} (joueur ${l.joueur_id}) de calendrier_officiel_id=${ID_DOUBLON} vers ${ID_ORIGINAL}`);
    if (!dryRun) {
      const { error: updErr } = await supabase
        .from('matchs_joueur')
        .update({ calendrier_officiel_id: ID_ORIGINAL })
        .eq('id', l.id);
      if (updErr) { console.error('Erreur ré-attachement :', updErr.message); process.exit(1); }
    }
  }
}

console.log(`${dryRun ? 'À supprimer' : 'Suppression'} : calendrier_officiel id=${ID_DOUBLON} (doublon, plus aucun lien après ré-attachement).`);
if (!dryRun) {
  const { error: delErr } = await supabase.from('calendrier_officiel').delete().eq('id', ID_DOUBLON);
  if (delErr) { console.error('Erreur suppression :', delErr.message); process.exit(1); }
  console.log('Terminé.');
} else {
  console.log('DRY RUN : rien n\'a été modifié. Relancer avec DRY_RUN=false pour appliquer réellement.');
}
