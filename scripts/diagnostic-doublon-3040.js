// Diagnostic lecture seule : id=3040 ("Villefranche Beaujolais vs Rouen",
// noms informels, 27/08) est un doublon du vrai match id=1972 ("FC
// VILLEFRANCHE BEAUJOLAIS vs FC ROUEN 1899", noms officiels, 29/08) —
// même pattern que le doublon VFC id=3042 nettoyé plus tôt cette session.
// Liste tous les matchs_joueur liés à id=3040 avant suppression, pour
// vérifier si d'autres joueurs que Sabihi y sont accrochés (auquel cas il
// faudrait migrer, pas juste supprimer).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://migarohddystlyhuoxfg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) { console.error('SUPABASE_SERVICE_ROLE_KEY manquant.'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const { data: rows, error: errC } = await supabase.from('calendrier_officiel').select('id, equipe_domicile, equipe_exterieur, date_match, division, groupe, saison').in('id', [3040, 1972]);
if (errC) { console.error('Erreur :', errC.message); process.exit(1); }
for (const r of rows) console.log(`  id=${r.id} — ${r.date_match} — ${r.equipe_domicile} vs ${r.equipe_exterieur} — division=${r.division} groupe=${r.groupe}`);

console.log('\n=== matchs_joueur liés à id=3040 (doublon présumé) ===');
const { data: liens3040, error: errL } = await supabase.from('matchs_joueur').select('id, joueur_id, date_match').eq('calendrier_officiel_id', 3040);
if (errL) { console.error('Erreur :', errL.message); process.exit(1); }
for (const m of liens3040) {
  const { data: j } = await supabase.from('joueurs').select('prenom, nom, club').eq('id', m.joueur_id).single();
  console.log(`  matchs_joueur id=${m.id} — joueur=${j?.prenom} ${j?.nom} (${j?.club}) — date=${m.date_match}`);
}
console.log(`\n${liens3040.length} ligne(s) matchs_joueur liée(s) à id=3040.`);

console.log('\n=== matchs_joueur liés à id=1972 (vrai match) ===');
const { data: liens1972, error: errL2 } = await supabase.from('matchs_joueur').select('id, joueur_id, date_match').eq('calendrier_officiel_id', 1972);
if (errL2) { console.error('Erreur :', errL2.message); process.exit(1); }
for (const m of liens1972) {
  const { data: j } = await supabase.from('joueurs').select('prenom, nom, club').eq('id', m.joueur_id).single();
  console.log(`  matchs_joueur id=${m.id} — joueur=${j?.prenom} ${j?.nom} (${j?.club}) — date=${m.date_match}`);
}
console.log(`\n${liens1972.length} ligne(s) matchs_joueur liée(s) à id=1972.`);
