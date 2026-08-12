// Renomme le club "Chantilly" en "US Chantilly" pour les joueurs concernés,
// afin que le rapprochement avec calendrier_officiel ("Générer mon
// calendrier") fonctionne. Affiche un aperçu avant toute écriture.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);

const supabase = createClient(supabaseUrl, supabaseKey);

const { data: joueurs, error } = await supabase
  .from('joueurs')
  .select('id, prenom, nom, club, niveau')
  .eq('club', 'Chantilly');
if (error) { console.error('Erreur lecture joueurs :', error.message); process.exit(1); }

console.log(`${(joueurs || []).length} joueur(s) avec club="Chantilly" :`);
for (const j of joueurs || []) console.log(`  ${j.prenom} ${j.nom} | niveau=${j.niveau} | id=${j.id}`);

if (!dryRun) {
  for (const j of joueurs || []) {
    const { error: updErr } = await supabase.from('joueurs').update({ club: 'US Chantilly' }).eq('id', j.id);
    if (updErr) { console.error(`Erreur mise à jour ${j.prenom} ${j.nom} :`, updErr.message); process.exit(1); }
  }
  console.log('\nTerminé.');
} else {
  console.log('\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour appliquer réellement.');
}
