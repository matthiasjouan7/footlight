// Reclasse tous les joueurs ayant poste="milieu_gauche" (valeur hors enum
// de l'application, jamais proposée au formulaire d'inscription, sans
// équivalent "milieu_droit") vers "ailier_gauche" — symétrique à la
// correction déjà appliquée à Antton Mouledous ("milieu_droit" ->
// "ailier_droit") dans scripts/importer-effectif-lorient-b.js.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);

const supabase = createClient(supabaseUrl, supabaseKey);

let joueurs = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase.from('joueurs').select('id, prenom, nom, club, niveau, poste').eq('poste', 'milieu_gauche').range(from, from + 999);
  if (error) { console.error('Erreur lecture joueurs :', error.message); process.exit(1); }
  if (!data || !data.length) break;
  joueurs = joueurs.concat(data);
  if (data.length < 1000) break;
}

console.log(`${joueurs.length} joueur(s) avec poste="milieu_gauche" à reclasser vers "ailier_gauche" :`);
for (const j of joueurs) console.log(`  ${j.prenom} ${j.nom} (id=${j.id}, club="${j.club}", niveau="${j.niveau}")`);

if (!dryRun) {
  for (const j of joueurs) {
    const { error: updErr } = await supabase.from('joueurs').update({ poste: 'ailier_gauche' }).eq('id', j.id);
    if (updErr) { console.error(`Erreur mise à jour ${j.prenom} ${j.nom} :`, updErr.message); process.exit(1); }
  }
  console.log('\nTerminé.');
} else {
  console.log('\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour appliquer réellement.');
}
