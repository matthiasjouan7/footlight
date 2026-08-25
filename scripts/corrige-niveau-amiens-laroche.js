// Corrige le champ "niveau" pour les joueurs d'Amiens SC et VFC La
// Roche-sur-Yon marqués à tort "N1" alors que calendrier_officiel confirme
// que ces deux clubs évoluent en Ligue 3 (saison 2026-2027, groupe Unique,
// 34 matchs chacun, aucune entrée N1 pour ces clubs cette saison).
//
// Ne touche QUE le champ niveau (jamais le club), ciblage par id.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const CLUBS_CONCERNES = ['Amiens SC', 'VFC La Roche-sur-Yon'];
const SAISON = '2026-2027';

const { data: joueurs, error } = await supabase
  .from('joueurs')
  .select('id, prenom, nom, club, niveau, saison')
  .in('club', CLUBS_CONCERNES)
  .eq('niveau', 'N1')
  .eq('saison', SAISON);
if (error) { console.error('Erreur lecture joueurs :', error.message); process.exit(1); }
console.log(`Joueur(s) à corriger (niveau N1 → Ligue 3) : ${joueurs?.length || 0}`);

for (const j of joueurs || []) {
  console.log(`${dryRun ? 'À corriger' : 'Correction'} : ${j.prenom} ${j.nom} (id=${j.id}, club="${j.club}") : N1 → Ligue 3`);
  if (!dryRun) {
    const { error: updErr } = await supabase.from('joueurs').update({ niveau: 'Ligue 3' }).eq('id', j.id);
    if (updErr) console.log(`  Erreur correction : ${updErr.message}`);
  }
}

console.log(`\nRésumé : ${joueurs?.length || 0} joueur(s) ${dryRun ? 'à corriger' : 'corrigé(s)'}.`);
if (dryRun) console.log('DRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
