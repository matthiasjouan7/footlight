// Corrige les doublons calendrier_officiel pour la journée 1 (N1, groupe C,
// 2026-08-22) : "Nîmes" vs "Canet-en-Roussillon" (id 2769) est un doublon de
// "NIMES OL" vs "CANET RFC" (id 2249), et "Lyon La Duchère" vs "Rumilly
// Vallières" (id 2765) est un doublon de "LYON LA DUCHERE" vs "GFA RUMILLY
// V" (id 2245). On garde les lignes à la casse standard utilisée par le
// reste de la saison et on supprime les doublons.
//
// Sécurité : DRY_RUN=true par défaut.
import { createClient } from '@supabase/supabase-js';

const dryRun = process.env.DRY_RUN !== 'false';
const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
console.log(`Mode : ${dryRun ? 'DRY RUN (aucune écriture)' : 'ÉCRITURE RÉELLE'}`);

const supabase = createClient(supabaseUrl, supabaseKey);

const IDS_A_SUPPRIMER = [2765, 2769];

for (const id of IDS_A_SUPPRIMER) {
  const { data: m, error: mErr } = await supabase.from('calendrier_officiel').select('*').eq('id', id).single();
  if (mErr) { console.error(`Erreur lecture id=${id} :`, mErr.message); process.exit(1); }
  console.log(`Ligne à supprimer : id=${m.id} | J${m.journee} | ${m.date_match} | "${m.equipe_domicile}" vs "${m.equipe_exterieur}"`);
}

if (!dryRun) {
  const { error: delErr } = await supabase.from('calendrier_officiel').delete().in('id', IDS_A_SUPPRIMER);
  if (delErr) { console.error('Erreur suppression :', delErr.message); process.exit(1); }
  console.log('\nTerminé.');
} else {
  console.log('\nDRY RUN : rien n\'a été écrit. Relancer avec DRY_RUN=false pour appliquer réellement.');
}
