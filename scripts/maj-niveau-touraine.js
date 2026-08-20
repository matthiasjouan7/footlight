// Met à jour le niveau de tous les joueurs d'Union Foot de Touraine, de
// "N2" à "N1" — suite à une erreur administrative, le club se retrouve
// finalement en National 1 (confirmé par l'utilisateur).
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);
const supabase = createClient(supabaseUrl, supabaseKey);

const CLUB = 'Union Foot de Touraine';
const ANCIEN_NIVEAU = 'N2';
const NOUVEAU_NIVEAU = 'N1';

const { data: joueurs, error } = await supabase
  .from('joueurs')
  .select('id, prenom, nom, club, niveau')
  .eq('club', CLUB);
if (error) { console.error('Erreur lecture joueurs :', error.message); process.exit(1); }

console.log(`${joueurs?.length || 0} joueur(s) trouvé(s) pour "${CLUB}".\n`);

let aMettreAJour = 0, ignores = 0;
for (const j of joueurs || []) {
  if (j.niveau !== ANCIEN_NIVEAU) {
    console.log(`${j.prenom} ${j.nom} : niveau déjà "${j.niveau || '—'}" (pas "${ANCIEN_NIVEAU}"), ignoré.`);
    ignores++;
    continue;
  }
  console.log(`${j.prenom} ${j.nom} : "${j.niveau}" -> "${NOUVEAU_NIVEAU}"`);
  aMettreAJour++;
  if (!dryRun) {
    const { error: updErr } = await supabase.from('joueurs').update({ niveau: NOUVEAU_NIVEAU }).eq('id', j.id);
    if (updErr) console.log(`  Erreur écriture : ${updErr.message}`);
  }
}
console.log(`\nRésumé : ${aMettreAJour} joueur(s) à mettre à jour, ${ignores} déjà à jour (ignoré(s)).`);
if (dryRun) console.log('DRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour écrire réellement.');
