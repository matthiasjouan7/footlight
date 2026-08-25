// Diagnostic lecture seule : détaille les lignes calendrier_officiel
// "Lorient B" qui créent l'ambiguïté avec "FC LORIENT 2" (30 matchs,
// calendrier complet N1 2026-2027 groupe B) empêchant la génération du
// calendrier des joueurs (club="FC Lorient B" en base). Vérifie aussi si
// ces lignes ont des matchs_joueur liés avant toute suppression.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const { data: lignes, error } = await supabase
  .from('calendrier_officiel')
  .select('*')
  .or('equipe_domicile.eq.Lorient B,equipe_exterieur.eq.Lorient B');
if (error) { console.error('Erreur lecture calendrier_officiel :', error.message); process.exit(1); }

console.log(`Ligne(s) "Lorient B" (exact) dans calendrier_officiel : ${lignes?.length || 0}`);
for (const l of lignes || []) {
  console.log(`  id=${l.id} | ${l.equipe_domicile} vs ${l.equipe_exterieur} | ${l.division} | groupe ${l.groupe} | saison ${l.saison} | ${l.date_match} | créé ${l.created_at}`);
}

const ids = (lignes || []).map((l) => l.id);
if (ids.length) {
  const { data: liens, error: errLiens } = await supabase
    .from('matchs_joueur')
    .select('id, calendrier_officiel_id')
    .in('calendrier_officiel_id', ids);
  if (errLiens) { console.error('Erreur lecture matchs_joueur :', errLiens.message); process.exit(1); }
  console.log(`\nmatchs_joueur lié(s) à ces lignes : ${liens?.length || 0}`);
  for (const l of liens || []) console.log(`  id=${l.id} → calendrier_officiel_id=${l.calendrier_officiel_id}`);
}
